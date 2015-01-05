


/**
 * @constructor
 */
barcode.reader.detector = function(canvas) {
  this.canvas_ = canvas;
  this.context_ = this.canvas_.getContext('2d'); // Used a lot
};


barcode.reader.detector.prototype.canvas_;
barcode.reader.detector.prototype.context_;
barcode.reader.detector.prototype.sequences_; // debugging data


/**
 * Search for a barcode. Right now just 1D.
 */
barcode.reader.detector.prototype.detect = function() {
  var image_data = this.context_.getImageData(
    0,
    Math.round(this.canvas_.height / 2),
    this.canvas_.width,
    1
  );

  // Scan across the entire center of the image.
  var line = this.get_line_(image_data);

  // Group the start/stop sequences.
  var start_sequence_grouped = this.group_sequence_(barcode.ean13.start_sequence);
  var stop_sequence_grouped = this.group_sequence_(barcode.ean13.stop_sequence);

  // Locate all possible start and stop sequences along the scan line.
  var start_sequences = this.find_sequences_(line, start_sequence_grouped);
  var stop_sequences = this.find_sequences_(line, stop_sequence_grouped);

  // Just to help with debugging.
  this.sequences_ = start_sequences.concat(stop_sequences); // TODO DEBUGGING ONLY
  // this.sequences_ = [].concat(start_sequences); // TODO DEBUGGING ONLY
  // console.log(this.sequences_);

  // Get the boundary information for the barcode based on the start/stop sequences.
  var bounds = this.get_bounds_(start_sequences, stop_sequences);

  // Group the detected barcode pixel data together.
  var grouped_line = this.group_sequence_(
    line.splice(bounds.start_pixel, bounds.stop_pixel - bounds.start_pixel)
  );

  // Calculate how many pixels each bar should use.
  var pixels_per_bar = (bounds.stop_pixel - bounds.start_pixel) / barcode.ean13.bytes;

  // Normalize the grouped line data so the "width" attribute more correctly
  // represents how many bits that value is.
  var normalized_grouped_line = grouped_line.map(function(element) {
    element.width = element.width / pixels_per_bar;
    return element;
  });
  var normalized_grouped_line_copy = grouped_line.map(function(e) { return e; }); // debug;

  var decoded = barcode.ean13.decode(normalized_grouped_line);
  console.log(decoded.join(''));
  // var decoded = {};



  if(true) { // debug
    // debug draw encoded
    this.context_.fillStyle = 'rgb(255, 255, 255)';
    this.context_.fillRect(0, Math.round(this.canvas_.height / 2) - 10, this.canvas_.width, 10);
    var position = bounds.start_pixel;
    for(var i = 0; i < normalized_grouped_line_copy.length; i++) {
      var rounded_width = Math.round(normalized_grouped_line_copy[i].width);
      if(normalized_grouped_line_copy[i].value === 1) {
        this.context_.fillStyle = 'rgb(0, 0, 255)';
      }
      else {
        this.context_.fillStyle = 'rgb(255, 255, 255)';
      }
      this.context_.fillRect(position, Math.round(this.canvas_.height / 2) - 10, rounded_width * pixels_per_bar, 10);
      position += rounded_width * pixels_per_bar;
    }

    // debug draw a red line across the width of the bounds
    this.context_.strokeStyle = 'rgba(255, 0, 0, .5)'; // Red across best pair
    this.context_.beginPath();
    this.context_.moveTo(bounds.start_pixel, Math.round(this.canvas_.height / 2) + 25);
    this.context_.lineTo(bounds.stop_pixel, Math.round(this.canvas_.height / 2) + 25);
    this.context_.lineWidth = 10;
    this.context_.stroke();

    // debug draw a green line if it decoded properly
    if(decoded.length === 12) {
      this.context_.strokeStyle = 'rgba(0, 255, 0, .5)'; // Green
      this.context_.beginPath();
      this.context_.moveTo(bounds.start_pixel, Math.round(this.canvas_.height / 2) + 35);
      this.context_.lineTo(bounds.stop_pixel, Math.round(this.canvas_.height / 2) + 35);
      this.context_.lineWidth = 10;
      this.context_.stroke();
    }
  }

};


/**
 * Get binary value for all of the pixels along horizontal line y. This function
 * is pretty much only useful because no non-horizontal lines are used when
 * scanning. If that switch was made to help locate barcodes or accept crazy
 * angles, then just swap this out with Bresenam's algorithm. For now, valuing
 * speed is more important: http://stackoverflow.com/a/4672319.
 *
 * This also "flips" the data. A value of 0 in the image data is a black pixel
 * and is returned as a 1. A value of 255 in the image data is a white pixel
 * and is returned as a 0.
 *
 * TODO: Rename this function to reflect the above a little clearer?
 */
barcode.reader.detector.prototype.get_line_ = function(image_data) {
  var line = [];

  for(var i = 0; i < image_data.data.length; i += 4) {
    line.push(image_data.data[i] === 0 ? 1 : 0);
  }

  return line;
}


/**
 * Given a set of possible start sequences and possible stop sequences, find the
 * pair of start/stop sequences that best seems to capture the barcode and
 * return boundary information.
 *
 * TODO: This was some stuff about determing about which stop sequence is the
 * right distance away. Revisit this. For now, just picking the longest match
 * and calling it good.
 */
barcode.reader.detector.prototype.get_bounds_ = function(start_sequences, stop_sequences) {
  var bounds = null;

  for(var i = 0; i < start_sequences.length; ++i) {
    for(var j = 0; j < stop_sequences.length; ++j) {
      var start_pixel = start_sequences[i][0].start_pixel;
      var stop_pixel = stop_sequences[j][stop_sequences[j].length - 1].stop_pixel;
      var width = stop_pixel - start_pixel;

      if(bounds === null || width > bounds.width) {
        bounds = {
          'start_pixel': start_pixel,
          'stop_pixel': stop_pixel,
          'width': width
        }
      }
    }
  }

  return bounds;
};

/**
 * Find a sequence of bits in a line. This does not make any assumption about
 * scale, so [1, 0, 1] could be that pattern where each bar is 10px or 100px
 * wide.
 *
 * The entire sequence scan is done with a single pass across the line.
 *
 * TODO: This can be improved by allowing an array of sequences as it's easily
 * possible to find an arbitrary number of sequences in a single pass.
 * Currently this would take 2 passes to find all the start and all the stop
 * sequences. Probably better things to optimize first.
 */
barcode.reader.detector.prototype.find_sequences_ = function(line, sequence) {
  var sequences = [];
  var possible_sequences = [];
  var current = {'value': line[0], 'width': 1};

  // Loop over the line. Actually looping over the length of the line plus one.
  // This last pixel will be undefined and trigger the logic that happens when
  // one bar ends and another begins. Without this, images ending with a black
  // pixel won't have the stop sequence properly identified.
  for(var i = 1; i < line.length + 1; ++i) {
    // When changing from a 0 to a 1 or vice versa
    if(line[i] !== current.value) {
      // Loop over the possible sqeuences backwards. If I find a match,
      // leave it in the array (or remove it if it's a full match). If the given
      // sequence is not a match, remove it from the array.
      for(var j = possible_sequences.length - 1; j >= 0; --j) {

        // This is just the index in the array that I currently need to be
        // concerned with. It's always at least 1, because the possible
        // sequence needs to have at least one value in it. Therefore, there is
        // always a previous value to calculate a ratio from. :)
        var sequence_index = possible_sequences[j].length;
        var expected_ratio = sequence[sequence_index - 1].width / sequence[sequence_index].width;
        var actual_ratio = possible_sequences[j][sequence_index - 1].width / current.width;

        // Allowed error margin when looking for a sequence. I believe this
        // can be pretty liberal as we're just looking for some rough matches
        // and will also filter by distance apart.
        var error_margin = 1.45;
        var ratio_match =
          actual_ratio >= expected_ratio - expected_ratio * error_margin &&
          actual_ratio <= expected_ratio + expected_ratio * error_margin

        // If the current value matches the last value in the currently being
        // checked sequence and the ratio is about right, then this is still
        // a possible match.
        if(current.value === sequence[sequence_index].value && ratio_match === true) {
          possible_sequences[j].push(current);

          // If I have a full length sequence match, save it and remove it from
          // the possibilities array.
          if(possible_sequences[j].length === sequence.length) {
            sequences.push(possible_sequences.splice(j, 1)[0]);
          }
        }
        else {
          // After each transition, if any given possible_sequence_sequence was
          // not updated, then it should be thrown out.
          possible_sequences.splice(j, 1);
        }
      }

      // If it's the sequence of a new sequence or stop sequence, add it in
      if(current.value === sequence[0].value) {
        possible_sequences.push([current]);
      }

      // Set the new current value.
      current = {'value': line[i], 'width': 0, 'start_pixel': i, 'stop_pixel': i};
    }

    // Each new pixel that doesn't change value from the previous pixel should
    // just increment width and where the current pixel group stops.
    current.width++;
    current.stop_pixel = i;
  }

  return sequences;
}


/**
 * Convert an array sequence like [1, 0, 0] into a data format that's a little
 * more accessible for the search algorithm. All consecutive bits in a sequence
 * get grouped together into an objects like {'width': 5, 'value': 0} and
 * then put into an array that is returned.
 */
barcode.reader.detector.prototype.group_sequence_ = function(sequence) {
  var current = {'value': sequence[0], 'width': 0};
  var groups = [];

  for(var i = 0; i < sequence.length; ++i) {
    if(sequence[i] !== current.value) {
      groups.push(current);
      current = {'value': sequence[i], 'width': 0};
    }
    current.width++;
  }
  groups.push(current);

  return groups;
}


/**
 * Just get any sequences that are stored. Mostly for debugging.
 */
barcode.reader.detector.prototype.get_sequences = function() {
  return this.sequences_;
}