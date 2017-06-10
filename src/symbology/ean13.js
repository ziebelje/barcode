barcode.symbology.ean13 = {};

barcode.symbology.ean13.encoding = {
  '1a': {
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
  '1b': [
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
  '2': {
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

barcode.symbology.ean13.begin_sequence = [1, 0, 1];
barcode.symbology.ean13.intermediate_sequence = [0, 1, 0, 1, 0];
barcode.symbology.ean13.end_sequence = [1, 0, 1];

/**
 * Number of bits that make up the entire barcode. Only 12 numbers are encoded
 * at 7 bits each. The first digit is not explicitely encoded.
 *
 * @type {number}
 */
barcode.symbology.ean13.bits = 84;

/**
 * Calculate the checksum digit given the barcode data.
 *
 * @param {string} data Barcode data. This can optionally include the checksum
 * digit itself; it will just be ignored.
 *
 * @return {number} The checksum digit.
 */
barcode.symbology.ean13.checksum = function(data) {
  var data_without_checksum = data.substring(0, 12);

  var weighted_sum = 0;
  for (var i = data_without_checksum.length - 1; i >= 0; i--) {
    if (i % 2 === 0) {
      weighted_sum += parseInt(data_without_checksum[i], 10);
    } else {
      weighted_sum += parseInt(data_without_checksum[i], 10) * 3;
    }
  }

  return (Math.ceil(weighted_sum / 10) * 10) - weighted_sum;
};
