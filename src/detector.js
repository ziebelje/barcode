/**
 * Detect a barcode by looking for it in the processed image data.
 */
barcode.detector = function() {};

/**
 * Search for a barcode.
 *
 * @param {Array.<number>} collapsed_image_data
 * @param {string} symbology
 *
 * @return {string} The decoded barcode.
 */
barcode.detector.prototype.detect = function(collapsed_image_data, symbology) {
  var time_start = performance.now();

  // Group the begin/end sequences.
  var begin_sequence_grouped = barcode.group_sequence(
    barcode.symbology[symbology].begin_sequence
  );
  var end_sequence_grouped = barcode.group_sequence(
    barcode.symbology[symbology].end_sequence
  );

  // Locate all possible begin and end sequences along the scan line.
  this.begin_sequences_ = this.find_sequences_(
    collapsed_image_data,
    begin_sequence_grouped
  );
  this.end_sequences_ = this.find_sequences_(
    collapsed_image_data,
    end_sequence_grouped
  );

  // Get the boundary information for the barcode based on the begin/end
  // sequences.
  var bounds = this.find_bounds_(
    this.begin_sequences_,
    this.end_sequences_,
    symbology
  );
  var result = [];
  for (var i = 0; i < bounds.length; i++) {
    // Group the detected barcode pixel data together and also splice out the
    // important part of the image data.
    var bars = barcode.group_sequence(
      collapsed_image_data.slice(
        bounds[i].start_pixel,
        bounds[i].stop_pixel
      )
    );

    result.push({
      'bounds': bounds[i],
      'data': bars,
      'symbology': symbology
    });
  }

  var time_end = performance.now();
  this.time_ = time_end - time_start;

  return result;
};

/**
 * Find a sequence of bits in a line. This does not make any assumption about
 * scale, so [1, 0, 1] could be that pattern where each bar is 10px or 100px
 * wide.
 *
 * The entire sequence scan is done with a single pass across the line.
 *
 * @param {Array.<number>} line The line to look in.
 * @param {Array.<number>} sequence The sequence to find.
 *
 * @return {Array.<Array.<Object>>} All of the detected sequences.
 */
barcode.detector.prototype.find_sequences_ = function(line, sequence) {
  var sequences = [];
  var possible_sequences = [];
  var current = {
    'value': line[0],
    'width': 1,
    'start_pixel': 0
  };

  // Loop over the line. Actually looping over the length of the line plus one.
  // This last pixel will be undefined and trigger the logic that happens when
  // one bar ends and another begins. Without this, images ending with a black
  // pixel won't have the stop sequence properly identified.
  for (var i = 1; i < line.length + 1; ++i) {
    // When changing from a 0 to a 1 or vice versa
    if (line[i] !== current.value) {
      // Loop over the possible sequences backwards (to look at the most
      // recent/shortest one first). If I find a match, leave it in the array
      // (or remove it if it's a full match). If the given sequence is not a
      // match, remove it from the array.
      for (var j = possible_sequences.length - 1; j >= 0; --j) {
        // This is just the index in the array that I currently need to be
        // concerned with. It's always at least 1, because the possible
        // sequence needs to have at least one value in it. Therefore, there is
        // always a previous value to calculate a ratio from. :)
        var sequence_index = possible_sequences[j].length;
        var expected_ratio = sequence[sequence_index - 1].width /
          sequence[sequence_index].width;
        var actual_ratio = possible_sequences[j][sequence_index - 1].width /
          current.width;

        // The sequence matching on it's own does not care about bar with. If
        // I'm expecting a [1, 0, 1] sequence where all bars are the same width
        // and I get a [1, 0, 1] sequence where the middle bar is really wide,
        // probably throw that one out.
        var percentage_difference = Math.abs(expected_ratio - actual_ratio) /
          ((expected_ratio + actual_ratio) / 2) * 100;

        // Raise this number if not finding enough sequence matches. Lower it if
        // finding way too many.
        var max_percentage_difference = 120;

        // If the current value matches the last value in the currently being
        // checked sequence and the ratio is about right, then this is still
        // a possible match.
        if (
          current.value === sequence[sequence_index].value &&
          percentage_difference <= max_percentage_difference
        ) {
          possible_sequences[j].push(current);

          // If I have a full length sequence match, save it and remove it from
          // the possibilities array.
          if (possible_sequences[j].length === sequence.length) {
            sequences.push(possible_sequences.splice(j, 1)[0]);
          }
        } else {
          // After each transition, if any given possible_sequence_sequence was
          // not updated, then it should be thrown out.
          possible_sequences.splice(j, 1);
        }
      }

      // If it's the sequence of a new sequence or stop sequence, add it in
      if (current.value === sequence[0].value) {
        possible_sequences.push([current]);
      }

      // Set the new current value.
      current = {
        'value': line[i],
        'width': 0,
        'start_pixel': i,
        'stop_pixel': i
      };
    }

    // Each new pixel that doesn't change value from the previous pixel should
    // just increment width and where the current pixel group stops.
    current.width++;
    current.stop_pixel = i;
  }

  return sequences;
};

/**
 * Given a set of possible start sequences and possible stop sequences, find
 * all pairs of start/stop sequences and order them by best fit. Best fit is
 * defined as the group of sequences that is closest to the expected width of
 * the barcode. The expected width of the barcode is determined by looking at
 * the size of the bars and, knowing how many bits are in the final barcode,
 * guessing how wide it should be.
 *
 * This isn't perfect because the bounds are found with start/stop sequences
 * that are very short and thus there's not a lot of data to extrapolate the
 * width from.
 *
 * @param {Array.<Array.<Object>>} begin_sequences
 * @param {Array.<Array.<Object>>} end_sequences
 * @param {string} symbology
 *
 * @return {Object}
 */
barcode.detector.prototype.find_bounds_ = function(
  begin_sequences,
  end_sequences,
  symbology
) {
  // TODO: Exclude bounds where the relative widths of the matches differ. Ex:
  // 1, 0, 1   and 11, 00, 11? Maybe...11, 0, 1 might still be valid though
  // because it just read wrong.

  // Get all combinations of start/stop sequences
  var bounds_combinations = [];
  for (var i = 0; i < begin_sequences.length; i++) {
    var begin_sequence_start_pixel =
      begin_sequences[i][0].start_pixel;
    var begin_sequence_stop_pixel =
      begin_sequences[i][begin_sequences[i].length - 1].stop_pixel;
    var begin_sequence_width =
      begin_sequence_stop_pixel - begin_sequence_start_pixel;

    for (var j = 0; j < end_sequences.length; j++) {
      var end_sequence_start_pixel =
        end_sequences[j][0].start_pixel;
      var end_sequence_stop_pixel =
        end_sequences[j][end_sequences[j].length - 1].stop_pixel;
      var end_sequence_width =
        end_sequence_stop_pixel - end_sequence_start_pixel;

      // Skip when the end bounds is before the start bounds.
      if (end_sequence_start_pixel <= begin_sequence_start_pixel) {
        continue;
      }

      var pixels_per_bit = (begin_sequence_width + end_sequence_width) /
        (
          barcode.symbology[symbology].begin_sequence.length +
          barcode.symbology[symbology].end_sequence.length
        );

      // Get the expected pixel width using the widths of the bars in these
      // bounds.
      var expected_width = pixels_per_bit * barcode.symbology[symbology].bits;

      // Get the pixel width of these bounds
      var actual_width = end_sequence_stop_pixel - begin_sequence_start_pixel;

      // Now determine how different the width of these bounds is from the
      // estimated barcode width.
      var percentage_difference = Math.abs(expected_width - actual_width) /
        ((expected_width + actual_width) / 2) * 100;

      // This is pretty generous and will tend to allow a lot of bounds. The
      // main issue is that calculating pixels_per_bit with such a small sample
      // size (just the begin/end sequences) ends up being pretty inaccurate.
      if (percentage_difference < 75) {
        bounds_combinations.push({
          'start_pixel': begin_sequence_start_pixel,
          'stop_pixel': end_sequence_stop_pixel,
          'width': actual_width,
          'percentage_difference': percentage_difference
        });
      }
    }
  }

  // Sort the combinations with the best one first.
  bounds_combinations.sort(function(a, b) {
    return Math.abs(a.percentage_difference) -
      Math.abs(b.percentage_difference);
  });

  return bounds_combinations;
};
