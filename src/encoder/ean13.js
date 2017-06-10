








/**
 * Encode part one of the barcode. This encodes the first number using one
 * table, then uses that value to pick from two different tables to encode the
 * subsequent six digits. Unlike the other digits, the first digit is not
 * represented directly by a pattern of bars.
 *
 * @private
 *
 * @param {string} string The string to encode.
 *
 * @return {Array.<number>}
 */
/* barcode.decoder.ean13.encode_part_1_ = function(string) {
  // var map = this.encoding_['1a'][string.charAt(0)];
  var map = (this.encoding_['1a'][string.charAt(0)]);
  // var map = [1, 1, 1, 1, 1, 1];
  var encoded = [];
  for (var i = 1; i < string.length; i++) {
    encoded = encoded.concat(this.encoding_['1b'][map[i - 1]][string.charAt(i)]);
  }

  return encoded;
};*/

/**
 * Simply looks up the digit in a table and encodes it.
 *
 * @private
 *
 * @param {string} string The string to encode.
 *
 * @return {Array.<number>}
 */
/* barcode.decoder.ean13.encode_part_2_ = function(string) {
  var encoded = [];
  for (var i = 0; i < string.length; i++) {
    encoded = encoded.concat(this.encoding_['2'][string.charAt(i)]);
  }

  return encoded;
};*/

/**
 * Encode the data.
 *
 * @return {!Array.<number>}
 */
/* barcode.decoder.ean13.encode = function() {
  // Hardcoded segments
  var start = barcode.symbology.ean13.begin_sequence;
  var intermediate = barcode.symbology.ean13.intermediate_sequence;
  var stop = barcode.symbology.ean13.end_sequence;

  // Grab the data we're going to encode.
  var data = this.data_;

  // Calculate checksum
  var checksum_odd_sum = 0;
  var checksum_even_sum = 0;
  for (var i = 0; i < data.length; ++i) {
    if (i % 2 === 0) {
      checksum_even_sum += parseInt(data[i], 10);
    } else {
      checksum_odd_sum += parseInt(data[i], 10);
    }
  }
  var checksum = (10 - ((3 * checksum_odd_sum + checksum_even_sum) % 10)) % 10;

  // Append the checksum to the end of the data.
  data += checksum;

  var encoded = [].concat(
      start,
      this.encode_part_1_(data.substring(0, 7)),
      intermediate,
      this.encode_part_2_(data.substring(7)),
      stop
      );

  return encoded;
};*/
