

/**
 * @constructor
 */
barcode.reader.detector = function(canvas) {
  this.canvas_ = canvas;
  this.context_ = this.canvas_.getContext('2d'); // Used a lot
};


barcode.reader.detector.canvas_;
barcode.reader.detector.context_;


/**
 * Search for a barcode. Right now just 1D.
 */
barcode.reader.detector.prototype.detect = function() {
  var x1 = 0;
  var y1 = Math.round(this.canvas_.height / 2);
  var x2 = this.canvas_.width;
  var y2 = y1;

  var line = this.get_line_(x1, y1, x2, y2);

  // draw the line on the canvas
  this.context_.strokeStyle = '#00ff00';
  this.context_.beginPath();
  this.context_.moveTo(x1, y1);
  this.context_.lineTo(x2, y2);
  this.context_.lineWidth = 1;
  this.context_.stroke();

  var start = this.chunk_sequence_(barcode.ean13.start);
  var stop = this.chunk_sequence_(barcode.ean13.stop);

  // console.log(start);
  // console.log(stop);

  var start_sequences = this.find_sequence_(line, start);
  var stop_sequences = this.find_sequence_(line, stop);

  for(var i = 0; i < start_sequences.length; ++i) {
    // console.log(start_sequences[i]);
    this.context_.strokeStyle = '#00ff00';
    this.context_.beginPath();
    this.context_.moveTo(start_sequences[i][0].start, Math.round(this.canvas_.height / 2));
    this.context_.lineTo(start_sequences[i][start_sequences[i].length-1].stop, Math.round(this.canvas_.height / 2));
    this.context_.lineWidth = 5;
    this.context_.stroke();
  }

  for(var i = 0; i < stop_sequences.length; ++i) {
    // console.log(stop_sequences[i]);
    this.context_.strokeStyle = '#00ff00';
    this.context_.beginPath();
    this.context_.moveTo(stop_sequences[i][0].start, Math.round(this.canvas_.height / 2));
    this.context_.lineTo(stop_sequences[i][stop_sequences[i].length-1].stop, Math.round(this.canvas_.height / 2));
    this.context_.lineWidth = 5;
    this.context_.stroke();
  }


  // Detect which, if any, appear to be a real barcode
  for(var i = 0; i < start_sequences.length; ++i) {
    // var bytes = barcode.ean13.length;
    var bytes = 101;
    // var pixels_per_byte = 10;
    var pixels_per_byte = start_sequences[i][0].length; // need to average all of the sequences together for this. Also need the same specialized format as the other function because I need to know how many 1s or 0s are in a row
    var expected_length = bytes * pixels_per_byte;
    var error_margin = 0.1; // %

    for(var j = 0; j < stop_sequences.length; ++j) {
      var start_index = start_sequences[i][0].start;
      var stop_index = stop_sequences[j][stop_sequences[j].length - 1].stop;
      var actual_length = stop_index - start_index;
      // console.log('ex: ' + expected_length + ' / act: ' + actual_length);
      // console.log(stop_sequences[j][stop_sequences[j].length - 1].stop - start_sequences[i][0].start);
      // if(stop_sequences[j][stop_sequences[j].length - 1].stop - start_sequences[i][0].start === 949) {
      if(actual_length >= expected_length - expected_length * error_margin && actual_length <= expected_length + expected_length * error_margin) {
        this.context_.strokeStyle = '#00ff00';
        this.context_.beginPath();
        this.context_.moveTo(start_sequences[i][0].start, Math.round(this.canvas_.height / 2) + 10);
        this.context_.lineTo(stop_sequences[j][stop_sequences[j].length - 1].stop, Math.round(this.canvas_.height / 2) + 10);
        this.context_.lineWidth = 10;
        this.context_.stroke();
        // console.log('FOUND BARCODE!');

        var chunked = this.chunk_sequence_(line.splice(start_index, stop_index - start_index));
        var encoded = [];
        for(var i_ = 0; i_ < chunked.length; ++i_) {
          for(var j_ = 0; j_ < Math.round(chunked[i_].length / pixels_per_byte); ++j_) {
            encoded.push(chunked[i_].value);
          }
        }
        barcode.ean13.decode(encoded);

      }
    }
  }

}


/**
 * Bresenham's algorithm to get all points along a line
 * http://stackoverflow.com/questions/4672279/bresenham-algorithm-in-javascript
 * TODO: Clean up this function
 */
barcode.reader.detector.prototype.get_line_ = function(x1, y1, x2, y2) {
  var image_data = this.get_image_data_();

  var line = [];

  var dx = Math.abs(x2-x1);
  var dy = Math.abs(y2-y1);
  var sx = (x1 < x2) ? 1 : -1;
  var sy = (y1 < y2) ? 1 : -1;
  var err = dx-dy;

  while(true) {
    // line.push([x1, y1]); // coordinates
    // TODO: for now, just return a sequence of 1s and 0s since that's what I care about at this pint
    line.push(image_data.data[(y1 * this.canvas_.width + x1) * 4] === 0 ? 1 : 0); // pixel value

    if ((x1==x2) && (y1==y2)) break;
    var e2 = 2*err;
    if (e2 >-dy){ err -= dy; x1  += sx; }
    if (e2 < dx){ err += dx; y1  += sy; }
  }

  return line;
}


/**
 * Grab the image data from the internal canvas.
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

// todo: this can be optimized to find multiple sequences in a single pass through the line instead
// of calling the whole function twice.
barcode.reader.detector.prototype.find_sequence_ = function(line, sequence) {

  // ean13 = 101 bits
  // looking for "101" followed by 98 more bits followed by "101"




  // console.log(sequence);

  // console.log(sequence);

  var sequences = [];
  var possible_sequences = [];
  var current = {'value': line[0], 'length': 0}; // should i start with 1 below and length be 1 here? TODO
  // console.log(line);
  for(var i = 0; i < line.length; ++i) {
    if(line[i] !== current.value) { // When changing from a 0 to a 1 or vice versa
      // console.log('transition from ' + current.value + ' to ' + line[i]);

      // Check and see if this belongs on any current possible start/stop sequences
      // var j;
      // console.log('possible_sequences: ' + possible_sequences.length);

      // Loop over the possible start sqeuences backwards. If I find a match,
      // leave it in the array (or remove it if it's a full match). If the given
      // start sequence is not a match, remove it from the array.
      for(var j = possible_sequences.length - 1; j >= 0; --j) {

        // This is just the index in the start array that I currently need to be
        // concerned with. It's always at least 1, because the possible start
        // sequence needs to have at least one value in it. Therefore, there is
        // always a previous value to calculate a ratio from. :)
        var sequence_index = possible_sequences[j].length;
        var expected_ratio = sequence[sequence_index - 1].length / sequence[sequence_index].length;
        var actual_ratio = possible_sequences[j][sequence_index - 1].length / current.length;

        // Allowed error margin when looking for a sequence. I believe this
        // can be pretty liberal as we're just looking for some rough matches
        // and will also filter by distance apart.
        var error_margin = 0.45;
        // console.log('ex: ' + expected_ratio + ' / act: ' + actual_ratio);
        // var ratio_match = expected_ratio === actual_ratio;
        var ratio_match = actual_ratio >= expected_ratio - expected_ratio * error_margin && actual_ratio <= expected_ratio + expected_ratio * error_margin
        // var ratio_match = actual_ratio >= 0.75 && actual_ratio <= 1.25;

        // console.log('Comparing sequences: ' + current.value + ' value ' + sequence[sequence_index].value + ' / ' + expected_ratio + ' ratio ' + actual_ratio);
        if(current.value === sequence[sequence_index].value && ratio_match === true) {
          // console.log('add to ');
          // console.log(JSON.parse( JSON.stringify( possible_sequences[j] ) ));
          possible_sequences[j].push(current);

          // If I have a full length sequence sequence match, save it and remove it
          // from the possibilities array.
          if(possible_sequences[j].length === sequence.length) {
            // console.log('SAVE sequence SEQUENCE!');
            sequences.push(possible_sequences.splice(j, 1)[0]);
          }
        }
        else {
          // After each transition, if any given possible_sequence_sequence was not
          // updated, then it should be thrown out.
          possible_sequences.splice(j, 1);
        }
      }

      // If it's the sequence of a new sequence or stop sequence, add it in
      if(current.value === sequence[0].value) {
        // console.log('new sequence sequence');
        possible_sequences.push([current]);
      }

      // Set the new current value.
      current = {'value': line[i], 'length': 0, 'start': i, 'stop': i};
    }

    current.length++;
    current.stop = i;
    // console.log(current);
  }

  return sequences;
}


  // Convert an array sequence like [1, 0, 0] into a data format that's a
  // little more accessible for the search algorithm.
barcode.reader.detector.prototype.chunk_sequence_ = function(sequence) {
  var current = {'value': sequence[0], 'length': 0};
  var chunked = [];

  for(var i = 0; i < sequence.length; ++i) {
    if(sequence[i] !== current.value) {
      chunked.push(current);
      current = {'value': sequence[i], 'length': 0};
    }
    current.length++;
  }
  chunked.push(current);

  return chunked;
}