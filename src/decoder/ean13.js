/**
 * EAN-13 decoder.
 *
 * @link http://barcode-coder.com/en/ean-13-specification-102.html
 */
barcode.decoder.ean13 = function() {
  barcode.decoder.apply(this, arguments);
};
barcode.extend(barcode.decoder.ean13, barcode.decoder);

/**
 * Decode.
 *
 * @param {Array.<Ojbect>} bars
 *
 * @return {[type]} [description]
 */
barcode.decoder.ean13.prototype.decode = function(bars) {
  var time_start = performance.now();

  // For this symbology, there should be exactly 59 distinct bars.
  if (bars.length !== 59) {
    return null;
  }

  // Normalize everything.
  var normalized_bars = this.get_normalized_bars_(
    bars,
    barcode.symbology.ean13.bits
  );

  var time_end = performance.now();
  this.time_ = time_end - time_start;

  return this.decode_(normalized_bars);
};

barcode.decoder.ean13.prototype.decode_ = function(normalized_bars) {
  // Decode the first 6 digits.
  var part_1 = this.decode_part_1_(normalized_bars);

  // EAN-13 symbology is such that 1b1 and 2 are inverses of each other. That
  // means that you can read the barcode backwards and still get actual results.
  // The encoding is also rather nice in that you can do some clever stuff to
  // read a code backwards but it's much cleaner to just invert the data and
  // start over.
  if (part_1.first_digit_encoding === '111111') {
    return this.decode_(normalized_bars.reverse());
  }

  // TODO: *MAYBE* add something in here to attempt to auto-correct any misreads
  // from the first 6 digits. hqdefault.jpg fails the decoder in the static test
  // because the 6th encoded digit reads as a 1b[0][2] instead of 1b[1][0].
  // Adding this additional logic to the decoder would probably make that static
  // image work and maybe some others, but for live images such a problem would
  // most likely be corrected in the next frame.

  // Decode the second 6 digits.
  var part_2 = this.decode_part_2_(normalized_bars);

  var decoded = '';

  // Now figure out what the first digit is supposed to be.
  for (var first_digit in barcode.symbology.ean13.encoding['1a']) {
    if (part_1.first_digit_encoding === barcode.symbology.ean13.encoding['1a'][first_digit].join('')) {
      decoded += first_digit;
      break;
    }
  }

  // If no valid first digit was found.
  if (decoded.length === 0) {
    return null;
  }

  decoded += part_1.decoded;
  decoded += part_2.decoded;

  // Validate the results of the scan with a checksum.
  var decoded_check_digit = parseInt(decoded[decoded.length - 1], 10);
  // console.log('checksum=' + barcode.symbology.ean13.checksum(decoded));
  var calculated_check_digit = barcode.symbology.ean13.checksum(decoded);
  if (decoded_check_digit === calculated_check_digit) {
    return decoded;
  }

  return null;
};

barcode.decoder.ean13.prototype.decode_part_1_ = function(normalized_bars) {
  var decoded = '';
  var first_digit_encoding = '';
  for (var i = 0; i < 6; i++) {
    var best_1b_0 = this.find_match_(
      normalized_bars,
      barcode.symbology.ean13.encoding['1b'][0],
      3 + (i * 4)
    );

    var best_1b_1 = this.find_match_(
      normalized_bars,
      barcode.symbology.ean13.encoding['1b'][1],
      3 + (i * 4)
    );

    if (best_1b_0.error < best_1b_1.error) {
      first_digit_encoding += '0';
      decoded += best_1b_0.value;
    } else {
      first_digit_encoding += '1';
      decoded += best_1b_1.value;
    }
  }

  return {
    'decoded': decoded,
    'first_digit_encoding': first_digit_encoding
  };
};

barcode.decoder.ean13.prototype.decode_part_2_ = function(normalized_bars) {
  var decoded = '';

  for (var i = 0; i < 6; i++) {
    var best_2 = this.find_match_(
      normalized_bars,
      barcode.symbology.ean13.encoding['2'],
      3 + 5 + (6 * 4) + (i * 4)
    );

    decoded += best_2.value;
  }

  return {'decoded': decoded};
};

  // TODO: Optimize by caching a grouped version of the encoding.
barcode.decoder.ean13.prototype.find_match_ = function(needle, haystack, offset) {
  var best_match;

  for (var value in haystack) {
    var error = 0;

    var hay = barcode.group_sequence(haystack[value]);
    for (var i = 0; i < hay.length; i++) {
      error += Math.abs(hay[i].width - needle[i + offset].width);
    }

    if (best_match === undefined || error < best_match.error) {
      best_match = {
        'value': value,
        'error': error,
        'count': hay.length
      };
    }
  }

  return best_match;
};
