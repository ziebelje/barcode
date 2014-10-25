


/**
 * EAN-13
 *
 * @constructor
 *
 * @extends {barcode}
 *
 * @link http://barcode-coder.com/en/ean-13-specification-102.html
 */
barcode.ean13 = function() {
  barcode.apply(this, arguments);
};
barcode.inherits(barcode.ean13, barcode);


/**
 * Valid data must be 12 digits.
 *
 * @private
 *
 * @type {RegExp}
 */
barcode.ean13.prototype.regex_ = /\d{12}/;


/**
 * Encoding tables for various parts of the barcode.
 *
 * @private
 *
 * @type {{1a: Object.<string, Array.<number>>, 1b: Array.<Object.<string, Array.<number>>>, 2: Object.<string, Array.<number>>}}
 */
barcode.ean13.prototype.encoding_ = {
  '1a': { // The first number of part 1 is encoded using this table.
    '0': [0, 0, 0, 0, 0, 0],
    '1': [0, 0, 1, 0, 1, 1],
    '2': [0, 0, 1, 1, 0, 1],
    '3': [0, 0, 1, 1, 1, 0],
    '4': [0, 1, 0, 0, 1, 1],
    '5': [0, 1, 1, 0, 0, 1],
    '6': [0, 1, 1, 1, 0, 0],
    '7': [0, 1, 0, 1, 0, 1],
    '8': [0, 1, 0, 1, 1, 0],
    '9': [0, 1, 1, 0, 1, 0]
  },
  '1b': [ // All subsequent numbers of part 1 are encoded using one of these two tables.
    {
      '0': [0, 0, 0, 1, 1, 0, 1],
      '1': [0, 0, 1, 1, 0, 0, 1],
      '2': [0, 0, 1, 0, 0, 1, 1],
      '3': [0, 1, 1, 1, 1, 0, 1],
      '4': [0, 1, 0, 0, 0, 1, 1],
      '5': [0, 1, 1, 0, 0, 0, 1],
      '6': [0, 1, 0, 1, 1, 1, 1],
      '7': [0, 1, 1, 1, 0, 1, 1],
      '8': [0, 1, 1, 0, 1, 1, 1],
      '9': [0, 0, 0, 1, 0, 1, 1]
    },
    {
      '0': [0, 1, 0, 0, 1, 1, 1],
      '1': [0, 1, 1, 0, 0, 1, 1],
      '2': [0, 0, 1, 1, 0, 1, 1],
      '3': [0, 1, 0, 0, 0, 0, 1],
      '4': [0, 0, 1, 1, 1, 0, 1],
      '5': [0, 1, 1, 1, 0, 0, 1],
      '6': [0, 0, 0, 0, 1, 0, 1],
      '7': [0, 0, 1, 0, 0, 0, 1],
      '8': [0, 0, 0, 1, 0, 0, 1],
      '9': [0, 0, 1, 0, 1, 1, 1]
    }
  ],
  '2': { // All numbers of part 2 are encoded using this table.
    '0': [1, 1, 1, 0, 0, 1, 0],
    '1': [1, 1, 0, 0, 1, 1, 0],
    '2': [1, 1, 0, 1, 1, 0, 0],
    '3': [1, 0, 0, 0, 0, 1, 0],
    '4': [1, 0, 1, 1, 1, 0, 0],
    '5': [1, 0, 0, 1, 1, 1, 0],
    '6': [1, 0, 1, 0, 0, 0, 0],
    '7': [1, 0, 0, 0, 1, 0, 0],
    '8': [1, 0, 0, 1, 0, 0, 0],
    '9': [1, 1, 1, 0, 1, 0, 0]
  }
};


/**
 * Encode the data.
 *
 * @return {!Array.<number>}
 */
barcode.ean13.prototype.encode = function() {
  // Hardcoded segments
  var start = [1, 0, 1];
  var intermediate = [0, 1, 0, 1, 0];
  var stop = [1, 0, 1];

  // Grab the data we're going to encode.
  var data = this.data_;

  // Calculate checksum
  var checksum_odd_sum = 0;
  var checksum_even_sum = 0;
  for (var i = 0; i < data.length; ++i) {
    if (i % 2 === 0) {
      checksum_even_sum += parseInt(data[i], 10);
    }
    else {
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
};


/**
 * Encode part one of the barcode. This encodes the first number using one
 * table, then uses that value to pick from two different tables to encode the
 * subsequent six digits.
 *
 * @private
 *
 * @param {string} string The string to encode.
 *
 * @return {Array.<number>}
 */
barcode.ean13.prototype.encode_part_1_ = function(string) {
  // var map = this.encoding_['1a'][string.charAt(0)];
  // TODO WHY DO I NEED THIS ANNOTATION?
  var map = /** @type {Array.<number>} */ (this.encoding_['1a'][string.charAt(0)]);
  // var map = [1, 1, 1, 1, 1, 1];
  var encoded = [];
  for (var i = 1; i < string.length; i++) {
    encoded = encoded.concat(this.encoding_['1b'][map[i - 1]][string.charAt(i)]);
  }
  return encoded;
};


/**
 * Simply looks up the digit in a table and encodes it.
 *
 * @private
 *
 * @param {string} string The string to encode.
 *
 * @return {Array.<number>}
 */
barcode.ean13.prototype.encode_part_2_ = function(string) {
  var encoded = [];
  for (var i = 0; i < string.length; i++) {
    encoded = encoded.concat(this.encoding_['2'][string.charAt(i)]);
  }
  return encoded;
};
