


/**
 * @constructor
 */
barcode.reader.detector = function(canvas) {
  this.canvas_ = canvas;
  this.context_ = this.canvas_.getContext('2d'); // Used a lot
};


barcode.reader.detector.prototype.canvas_;
barcode.reader.detector.prototype.context_;
barcode.reader.detector.prototype.scan_line_; // the horizontal line that we're looking for a barcode on
barcode.reader.detector.prototype.sequences_; // debugging data


/**
 * Search for a barcode. Right now just 1D.
 */
barcode.reader.detector.prototype.detect = function() {
  // Scan across the entire center of the image.
  this.scan_line_ = this.get_line_(this.canvas_.height / 2);

  // Take the default start/stop byte arrays and group them.
  var start = this.group_sequence_(barcode.ean13.start);
  var stop = this.group_sequence_(barcode.ean13.stop);

  // Locate all possible start and stop sequences along the scan line.
  var start_sequences = this.find_sequence_(this.scan_line_, start);
  var stop_sequences = this.find_sequence_(this.scan_line_, stop);

  // Just to help with debugging.
  this.sequences_ = start_sequences.concat(stop_sequences);

  // Detect which, if any, appear to be a real barcode.
  for(var i = 0; i < start_sequences.length; ++i) {
    var pixels_per_byte = this.get_average_pixels_per_byte_(start, start_sequences[i]);

    // Guess the length of the entire barcode to predict which stop sequence is correct.
    var expected_length = barcode.ean13.bytes * pixels_per_byte;
    var error_margin = 0.05;

    // For every start sequence, loop over all stop sequences to find possible
    // full barcodes.
    for(var j = 0; j < stop_sequences.length; ++j) {
      var start_index = start_sequences[i][0].start;
      var stop_index = stop_sequences[j][stop_sequences[j].length - 1].stop;
      var actual_length = stop_index - start_index;

      // If there's a match within the error margin...
      if(
        actual_length >= expected_length - expected_length * error_margin &&
        actual_length <= expected_length + expected_length * error_margin
      ) {
        var encoded = this.get_encoded_(
          this.scan_line_,
          start_index,
          stop_index,
          pixels_per_byte
        );

        barcode.ean13.decode(encoded);
      }
    }
  }

}


/**
 * Get binary value for all of the pixels along horizontal line y. This function
 * is pretty much only useful because no non-horizontal lines are used when
 * scanning. If that switch was made to help locate barcodes or accept crazy
 * angles, then just swap this out with Bresenam's algorithm. For now, valuing
 * speed is more important: http://stackoverflow.com/a/4672319.
 */
barcode.reader.detector.prototype.get_line_ = function(y) {
  var image_data = this.get_image_data_();

  var line = [];

  for(var i = this.canvas_.width * y * 4; i < this.canvas_.width * (y + 1) * 4; i += 4) {
    line.push(image_data.data[i] === 0 ? 1 : 0);
  }

  return line;
}


/**
 * Grab the image data from the internal canvas.
 *
 * TODO: Would probably be simpler just to save this on the object and use it
 * directly and then write it to the canvas at the very end
 */
barcode.reader.detector.prototype.get_image_data_ = function() {
  return this.context_.getImageData(
    0,
    0,
    this.canvas_.width,
    this.canvas_.height
  );
}

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
barcode.reader.detector.prototype.find_sequence_ = function(line, sequence) {
  var sequences = [];
  var possible_sequences = [];
  var current = {'value': line[0], 'length': 0}; // should i start with 1 below and length be 1 here?

  // Loop over the line
  for(var i = 0; i < line.length; ++i) {
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
        var expected_ratio = sequence[sequence_index - 1].length / sequence[sequence_index].length;
        var actual_ratio = possible_sequences[j][sequence_index - 1].length / current.length;

        // Allowed error margin when looking for a sequence. I believe this
        // can be pretty liberal as we're just looking for some rough matches
        // and will also filter by distance apart.
        var error_margin = 0.45;
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
      current = {'value': line[i], 'length': 0, 'start': i, 'stop': i};
    }

    // Each new pixel that doesn't change value from the previous pixel should
    // just increment length and where the current pixel group stops.
    current.length++;
    current.stop = i;
  }

  return sequences;
}


/**
 * Convert an array sequence like [1, 0, 0] into a data format that's a little
 * more accessible for the search algorithm. All consecutive bits in a sequence
 * get grouped together into an objects like {'length': 5, 'value': 0} and
 * then put into an array that is returned.
 */
barcode.reader.detector.prototype.group_sequence_ = function(sequence) {
  var current = {'value': sequence[0], 'length': 0};
  var groups = [];

  for(var i = 0; i < sequence.length; ++i) {
    if(sequence[i] !== current.value) {
      groups.push(current);
      current = {'value': sequence[i], 'length': 0};
    }
    current.length++;
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


/**
 * Determine an average number of pixels per byte from a set of known
 * byte-length pixel sequences.
 */
barcode.reader.detector.prototype.get_average_pixels_per_byte_ = function(expected_sequence, actual_sequence) {
  var pixels = 0;
  var bytes = 0;

  for(var i = 0; i < expected_sequence.length; ++i) {
    pixels += actual_sequence[i].length;
    bytes += expected_sequence[i].length;
  }

  return pixels / bytes;
}


/**
 * Take a line of pixels with a start and stop point and convert it into a
 * binary-encoded version of the barcode data.
 */
barcode.reader.detector.prototype.get_encoded_ = function(line, start_index, stop_index, pixels_per_byte) {
  // Group the suspected barcode sequence.
  var grouped = this.group_sequence_(
    line.splice(start_index, stop_index - start_index)
  );

  var encoded = [];
  for(var i = 0; i < grouped.length; ++i) {
    var bytes = Math.round(grouped[i].length / pixels_per_byte);
    for(var j = 0; j < bytes; ++j) {
      encoded.push(grouped[i].value);
    }
  }

  return encoded;
}