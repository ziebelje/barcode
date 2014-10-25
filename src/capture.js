


/**
 * @constructor
 *
 * http://book.realworldhaskell.org/read/barcode-recognition.html
 * http://www.google.com/patents/US20120091204
 * https://code.google.com/p/jjil/wiki/FindingTheBarcode
 * http://www.ijeset.com/media/0001/8I4-IJESET410-ROBUST-BARCODE.pdf (threshold)
 * http://www.math.tau.ac.il/~turkel/notes/otsu.pdf
 *
 * binarize
 * http://users.soe.ucsc.edu/~manduchi/papers/barcodes.pdf (long read, appears to argue against binarization. Uses some barcode detection)
 * http://www.researchgate.net/publication/224149969_Knowledge_guided_adaptive_binarization_for_2D_barcode_images_captured_by_mobile_phones (good but takes a long time)
 *
 */
barcode.capture = function(options) {
  // Always create my own canvas to work on.
  // Save the context since it's used a lot.
  this.canvas_ = document.createElement('canvas');
  this.context_ = this.canvas_.getContext('2d');

  // Set some stuff.
  this.interval_ = options.interval;
  this.fixed_threshold_ = options.threshold;
  this.symbology_ = options.symbology;
  this.source_ = options.source;

  // Detect the type.
  var source_type = Object.prototype.toString.call(this.source_);
  var matches = source_type.match(/^\[object HTML(Video|Canvas)Element\]/);
  this.type_ = matches[1].toLowerCase();
}


barcode.capture.prototype.type_;
barcode.capture.prototype.source_;

barcode.capture.prototype.canvas_;
barcode.capture.prototype.context_;

barcode.capture.prototype.interval_;
barcode.capture.prototype.interval_id_;

barcode.capture.prototype.fixed_threshold_;
barcode.capture.prototype.threshold_;
barcode.capture.prototype.symbology_;




/**
 * Start processing the image
 */
barcode.capture.prototype.process_ = function() {

  this.copy_image_();
  this.grayscale_();

  var histogram = this.get_histogram_();

  if(this.fixed_threshold_) {
    this.threshold_ = this.fixed_threshold_;
  }
  else {
    this.threshold_ = this.get_threshold_(histogram);
  }

  this.binarize_(this.threshold_);

  var lines = this.search_();

  this.display_histogram_(histogram);
  this.display_threshold_(this.threshold_);

  return;

  // STEP 2: FIND LINES

  // An array of things that have been determined to be actual lines.
  var lines = [];

  // An array of things that are currently in the process of being identified as lines.
  var current_lines = [];

  // Search current_lines for a line that a given x, y coordinate would belong to
  var search_current_lines = function(slice_start_x, slice_stop_x) {

    for(var i = 0; i < current_lines.length; ++i) {
      // Making this 1 will allow a 1px offset in either the left or the right side or both at once
      if(Math.abs(slice_start_x - current_lines[i].x_begin) <= 2 && Math.abs(slice_stop_x - current_lines[i].x_end) <= 2) {
        return current_lines[i];
      }
    }
  }

  // Add a new entry to current_lines
  var add_to_current_lines = function(slice_start_x, slice_stop_x, y) {

    current_lines.push({
      // 'y_begin': y,
      // 'y_end': y,
      'x_begin': slice_start_x, // tracks the most recent x to allow for slight offsets over the length of the line
      'x_end': slice_stop_x, // ditto
      'top_left': {'x': slice_start_x, 'y': y}, // never changes
      'bottom_right': {'x': slice_stop_x, 'y': y} // gets updated each time this line is extended
    });
  }

  // Extend a line in current_lines with a new value
  // var extend_current_line = function(x, y, current_line) {
  var extend_current_line = function(slice_start_x, slice_stop_x, y, current_line) {

    current_line.x_begin = slice_start_x;
    current_line.x_end = slice_stop_x;

    current_line.bottom_right = {'x': slice_stop_x, 'y': y};
  }

  // Move all current_lines to lines if their last y location is before the specified y.
  var move_completed_current_lines = function(y) {

    for(var i = current_lines.length - 1; i >= 0; --i) {
      if(current_lines[i].bottom_right.y < y) {


        lines.push(current_lines.splice(i, 1)[0]);
      }
    }
 }


  var slice_start_x = null;
  var slice_stop_x = null;

  var start_or_continue_slice = function(x) {
    if(slice_start_x === null) {
      slice_start_x = x;
    }
  }

  var stop_slice = function(x) {
    if(slice_start_x !== null) { // (only bother if we currently have a slice)
      slice_stop_x = x; // the previous pixel was the last black pixel in the slice

      // Draw a horizontal line on the slice
      debug_context.strokeStyle = '#00ff00';
      debug_context.beginPath();
      debug_context.moveTo(slice_start_x, y);
      debug_context.lineTo(slice_stop_x, y);
      debug_context.lineWidth = 4;
      debug_context.stroke();

      if(slice_stop_x - slice_start_x >= 1) { // If there was at least one pixel in the slice

        var current_line = search_current_lines(slice_start_x, slice_stop_x); // Search for an existing line that this slice might match up to
        if(current_line) { // If there was one
          extend_current_line(slice_start_x, slice_stop_x, y, current_line); // Extend it with this new slice
        }
        else { // Otherwise
          add_to_current_lines(slice_start_x, slice_stop_x, y); // Start a new line
        }
      }

      slice_start_x = null;
    }
  }

  var scan_interval = Math.round(canvas.height / 10);

  // Scan over the image in some vertical interval.
  for(var y = 0; y < canvas.height; y+= scan_interval) {

    // Draw a horizontal line across the image where I'm looking at.
    debug_context.strokeStyle = '#cccccc';
    debug_context.lineWidth = 1;
    debug_context.beginPath();
    debug_context.moveTo(0, y);
    debug_context.lineTo(canvas.width, y);
    debug_context.stroke();

    // Loop over the pixel data of the current scan line. All of the extra
    // math here is because the canvas pixel data is stored in a 1D array
    // with 4 items per pixel [r, g, b, alpha].
    for(var i = canvas.width * y * 4; i < (canvas.width * y * 4) + (canvas.width * 4); i += 4) {
      // Grab the actual x coordinate of the current pixel.
      var x = ((i / 4) % canvas.width);

      if(x === canvas.width - 1) {
        // If this pixel is the last pixel in the line, end any current slices.
        // The end of the slice is the current pixel if it's black or the
        // current pixel minus 1 if it's white.
        stop_slice(x - threshold_data[i] / 255);
      }
      else {
        // If this pixel is not the last pixel in the line...
        if(threshold_data[i] === 0) {
          // ...then start or continue the current slice on black pixel.
          start_or_continue_slice(x);
        }
        else if(threshold_data[i] === 255) {
          // ...then end slice on the previous pixel if the current one is
          // white. For now a single white pixel will end a slice. May need to
          // add some more flexibility here in the future.
          stop_slice(x - 1);
        }
      }
    }

    // Move out any lines that weren't updated during this pass. They can be
    // assumed to have ended.
    move_completed_current_lines(y);
  }

  // Now move any leftover lines in current_lines to lines. This happens because I might
  // process a scanline and it sees that there are still horizontal lines coming down.
  // It doesn't know that it won't get another chance to see if they stopped because the next
  // scanline might be off the bottom of the canvas.
  while(current_lines.length > 0) {
    lines.push(current_lines.splice(0, 1)[0]);
  }

  // Draw the found lines on the canvas
  for(var i = 0; i < lines.length; ++i) {
    var width = lines[i].bottom_right.x - lines[i].top_left.x;
    var height = lines[i].bottom_right.y - lines[i].top_left.y;

    if(height === 0) {
      continue;
    }
    if(width === 0) {
      width = 1;
    }

    // debug_context.fillStyle = 'rgba(' + Math.round(Math.random() * 255) + ', ' + Math.round(Math.random() * 255) + ', ' + Math.round(Math.random() * 255) + ', .8)';
    // debug_context.fillStyle = 'rgba(0, 0, 255, 0.8)';

    debug_context.fillRect(lines[i].top_left.x, lines[i].top_left.y, width, height);
  }

  // STEP 3: Choose localized area where I think barcode is

  // STEP 4: Read several lines of the barcode, average them, then normalize them

  // Step 5: Assuming we know the barcode type, decode it!

  // Start with one scan line across the center of the document. If I find what appears
  // to be a start / stop sequence, figure I've got the barcode at that location. Then
  // generate a couple of extra parallel lines slightly above and below and read that data.
  // Average all of the sequence lengths together and ta-da!

  // If there's no immediate match, start segmenting the document up even further.
  // Use lines that criss-cross the document and continue to look for the start/stop
  // sequence. Once I find it, generate parallel lines and average together.

}


/**
 * For video input, attempt to capture at the configured interval length. For
 * canvas input, do a single capture.
 */
barcode.capture.prototype.start = function() {

  this.show_canvas_();

  if(this.type_ === 'video') {
    var self = this;
    this.interval_id_ = setInterval(
      function() {
        self.process_();
      },
      this.interval_
    );
  }
  else if(this.type_ === 'canvas') {
    this.process_();
  }
}


/**
 * Stop capturing. Both video and canvas captures can use this as it will also
 * hide the internal canvas if it was displayed.
 */
barcode.capture.prototype.stop = function() {
  clearInterval(this.interval_id_);
  this.hide_canvas_();
}


/**
 * Show the internal canvas.
 *
 * TODO: Only call this if there is a reason to show it, like wanting to display
 * certain visiual effects often just for debugging.
 */
barcode.capture.prototype.show_canvas_ = function() {
  this.source_.parentNode.appendChild(this.canvas_);

  if(this.type_ === 'video') {
    this.canvas_.width = this.source_.videoWidth;
    this.canvas_.height = this.source_.videoHeight;
  }
  else if(this.type_ === 'canvas') {
    this.canvas_.width = this.source_.width;
    this.canvas_.height = this.source_.height;
  }

  var rect = this.source_.getBoundingClientRect();
  this.canvas_.style.position = 'absolute';
  this.canvas_.style.left = rect.left + 'px';
  this.canvas_.style.top = rect.top + 'px';
}


/**
 * Remove the internal canvas from the DOM.
 */
barcode.capture.prototype.hide_canvas_ = function() {
  this.canvas_.parentNode.removeChild(this.canvas_);
}


/**
 * Copy the canvas or current video frame into the internal canvas.
 */
barcode.capture.prototype.copy_image_ = function() {
  this.context_.drawImage(
    this.source_,
    0,
    0,
    this.canvas_.width,
    this.canvas_.height
  );
}


/**
 * Grab the image data from the internal canvas.
 */
barcode.capture.prototype.get_image_data_ = function() {
  return this.context_.getImageData(
    0,
    0,
    this.canvas_.width,
    this.canvas_.height
  );
}


/**
 * Make my image grayscale.
 */
barcode.capture.prototype.grayscale_ = function() {
  var image_data = this.get_image_data_();

  for(var i = 0; i < image_data.data.length; i += 4) {
    var luminosity =
      0.2126 * image_data.data[i] +
      0.7152 * image_data.data[i + 1] +
      0.0722 * image_data.data[i + 2]
    ;

    image_data.data[i] = image_data.data[i + 1] = image_data.data[i + 2] = luminosity;
  }

  this.context_.putImageData(image_data, 0, 0);
}


/**
 * Binarize the already grayscale image around a threshold.
 */
barcode.capture.prototype.binarize_ = function(threshold) {
  var image_data = this.get_image_data_();

  for (var i = 0; i < image_data.data.length; i += 4) {
    var value = (image_data.data[i] + image_data.data[i + 1] + image_data.data[i + 2] >= threshold) ? 255 : 0;
    image_data.data[i] = image_data.data[i+1] = image_data.data[i+2] = value;
  }

  this.context_.putImageData(image_data, 0, 0);
}


/**
 * Get the histogram for the image.
 */
barcode.capture.prototype.get_histogram_ = function() {
  var image_data = this.get_image_data_();

  // http://stackoverflow.com/questions/1295584/most-efficient-way-to-create-a-zero-filled-javascript-array
  var histogram = Array.apply(null, new Array(256)).map(Number.prototype.valueOf, 0);

  for (var i = 0; i < image_data.data.length; i += 4) {
    histogram[image_data.data[i]]++;
  }

  return histogram;
}


/**
 * Generate the threshold using the otsu method.
 * TODO: Clean up this function
 * http://en.wikipedia.org/wiki/Otsu%27s_method
 */
barcode.capture.prototype.get_threshold_ = function(histogram) {
/*  var get_weight = function(left_boundary, right_boundary) {
    var weight = 0;
    for(var i = left_boundary; i < right_boundary; ++i) {
      weight += histogram[i];
    }
    return weight;
  }

  var threshold, left_boundary, right_boundary, weight_left, weight_right;

  threshold = 128; // center of the weighing scale threshold
  left_boundary = 0;
  right_boundary = 255;
  weight_left = get_weight(left_boundary, threshold + 1); // weight on the left weight_left
  weight_right = get_weight(threshold + 1, right_boundary + 1); // weight on the right weight_right
  while (left_boundary <= right_boundary) {

   if (weight_right > weight_left) { // right side is heavier
     weight_right -= histogram[right_boundary--];
     if (((left_boundary + right_boundary) / 2) < threshold) {
       weight_right += histogram[threshold];
       weight_left -= histogram[threshold--];
     }
   } else if (weight_left >= weight_right) { // left side is heavier
     weight_left -= histogram[left_boundary++];
     if (((left_boundary + right_boundary) / 2) > threshold) {
       weight_left += histogram[threshold + 1];
       weight_right -= histogram[threshold + 1];
       threshold++;
     }
   }
  }
  return threshold;*/


  var total = this.canvas_.height * this.canvas_.width;

  var sum = 0;
  for (var i = 1; i < 256; ++i)
      sum += i * histogram[i];
  var sumB = 0;
  var wB = 0;
  var wF = 0;
  var mB;
  var mF;
  var max = 0.0;
  var between = 0.0;
  var threshold1 = 0.0;
  var threshold2 = 0.0;
  for (var i = 0; i < 256; ++i) {
      wB += histogram[i];
      if (wB == 0)
          continue;
      wF = total - wB;
      if (wF == 0)
          break;
      sumB += i * histogram[i];
      mB = sumB / wB;
      mF = (sum - sumB) / wF;
      between = wB * wF * Math.pow(mB - mF, 2);
      if ( between >= max ) {
          threshold1 = i;
          if ( between > max ) {
              threshold2 = i;
          }
          max = between;
      }
  }
  var threshold = ( threshold1 + threshold2 ) / 2.0;

  return threshold;
}


/**
 * Display the histogram of the grayscaled image on the internal canvas.
 */
barcode.capture.prototype.display_histogram_ = function(histogram) {
  var scale = (this.canvas_.height / 2 ) / Math.max.apply(null, histogram);

  for(var i = 0; i < histogram.length; ++i) {
    this.context_.strokeStyle = '#ff0000';
    this.context_.beginPath();
    this.context_.moveTo(i, this.canvas_.height);
    this.context_.lineTo(i, (this.canvas_.height - histogram[i] * scale));
    this.context_.lineWidth = 1;
    this.context_.stroke();
  }
}


/**
 * Display the threshold value on the internal canvas.
 */
barcode.capture.prototype.display_threshold_ = function(threshold) {
  this.context_.strokeStyle = '#ff0000';
  this.context_.beginPath();
  this.context_.moveTo(threshold, 0);
  this.context_.lineTo(threshold, this.canvas_.height);
  this.context_.lineWidth = 3;
  this.context_.stroke();
}

/**
 * Get the current threshold value.
 */
barcode.capture.prototype.get_threshold = function() {
  return this.threshold_;
}

/**
 * Set the current threshold value.
 */
barcode.capture.prototype.set_threshold = function(threshold) {
  this.threshold_ = threshold;
}

/**
 * Search for a barcode. Right now just 1D.
 */
barcode.capture.prototype.search_ = function() {
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


  // todo: this can be optimized to find multiple sequences in a single pass through the line instead
  // of calling the whole function twice.
  var find_sequence = function(line, sequence) {

    // ean13 = 101 bits
    // looking for "101" followed by 98 more bits followed by "101"

    // Convert an array sequence like [1, 0, 0] into a data format that's a
    // little more accessible for the search algorithm.
    var chunk_sequence = function(sequence) {
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

    sequence = chunk_sequence(sequence);
    // console.log(sequence);

    console.log(sequence);

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

          // console.log('Comparing sequences: ' + current.value + ' value ' + sequence[sequence_index].value + ' / ' + expected_ratio + ' ratio ' + actual_ratio);
          if(current.value === sequence[sequence_index].value && expected_ratio === actual_ratio) {
            // console.log('add to ');
            // console.log(JSON.parse( JSON.stringify( possible_sequences[j] ) ));
            possible_sequences[j].push(current);

            // If I have a full length sequence sequence match, save it and remove it
            // from the possibilities array.
            if(possible_sequences[j].length === sequence.length) {
              // console.log('SAVE sequence SEQUENCE!');
              sequences.push(possible_sequences.splice(j, 1));
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
        current = {'value': line[i], 'length': 0};
      }

      current.length++;
      // console.log(current);
    }

    return sequences;
  }


  var start = [1, 0, 1];
  var stop = [1, 0, 1];

  var start_sequences = find_sequence(line, start);
  var stop_sequences = find_sequence(line, stop);
  console.log(start_sequences);
  console.log(stop_sequences);
}


/**
 * Bresenham's algorithm to get all points along a line
 * http://stackoverflow.com/questions/4672279/bresenham-algorithm-in-javascript
 * TODO: Clean up this function
 */
barcode.capture.prototype.get_line_ = function(x1, y1, x2, y2) {
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

  // http://en.wikipedia.org/wiki/Balanced_histogram_thresholding
/*  var balanced_histogram = function(histogram) {
    var get_weight = function(left_boundary, right_boundary) {
      var weight = 0;
      for(var i = left_boundary; i < right_boundary; ++i) {
        weight += histogram[i];
      }
      return weight;
    }

    var threshold, left_boundary, right_boundary, weight_left, weight_right;

   threshold = 128; // center of the weighing scale threshold
   left_boundary = 0;
   right_boundary = 255;
   weight_left = get_weight(left_boundary, threshold + 1); // weight on the left weight_left
   weight_right = get_weight(threshold + 1, right_boundary + 1); // weight on the right weight_right
   while (left_boundary <= right_boundary) {

     if (weight_right > weight_left) { // right side is heavier
       weight_right -= histogram[right_boundary--];
       if (((left_boundary + right_boundary) / 2) < threshold) {
         weight_right += histogram[threshold];
         weight_left -= histogram[threshold--];
       }
     } else if (weight_left >= weight_right) { // left side is heavier
       weight_left -= histogram[left_boundary++];
       if (((left_boundary + right_boundary) / 2) > threshold) {
         weight_left += histogram[threshold + 1];
         weight_right -= histogram[threshold + 1];
         threshold++;
       }
     }
   }
  // debugger;
   return threshold;



  }*/