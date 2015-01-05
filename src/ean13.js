


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
barcode.ean13.regex_ = /\d{12}/;


/**
 * Encoding tables for various parts of the barcode.
 *
 * @private
 *
 * @type {{1a: Object.<string, Array.<number>>, 1b: Array.<Object.<string, Array.<number>>>, 2: Object.<string, Array.<number>>}}
 */
barcode.ean13.encoding_ = {
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


barcode.ean13.start_sequence = [1, 0, 1];
barcode.ean13.intermediate_sequence = [0, 1, 0, 1, 0];
barcode.ean13.stop_sequence = [1, 0, 1];
barcode.ean13.bytes = 95;

/**
 * Encode the data.
 *
 * @return {!Array.<number>}
 */
barcode.ean13.encode = function() {
  // Hardcoded segments
  var start = barcode.ean13.start_sequence;
  var intermediate = barcode.ean13.intermediate_sequence;
  var stop = barcode.ean13.stop_sequence;

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
 */
barcode.ean13.decode = function(normalized_grouped_line) {
  var decoded = [];

  // console.log(normalized_grouped_line);

  var group_sequence = function(sequence) {
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
  };
  var get_next_match = function(needle, haystack, best_hay) {
    // TODO do all of the ean13 encoding operations up front so we don't have
    // to repeat that work every single time this runs.
    // console.log(needle);
    // console.log(haystack);
    best_hay = best_hay || null;
    // if(best_hay) {
    //   console.log('starting with best_hay');
    //   console.log(best_hay);
    // }
    for(var value in haystack) {
      var hay = group_sequence(haystack[value]);
      var error = 0;
      for(var i = 0; i < hay.length; ++i) {
        error += Math.abs(hay[i].width - needle[i].width);
      }
      if(best_hay === null || error < best_hay.error) {
        best_hay = {
          'value': value,
          'error': error,
          'count': hay.length
        };
      }
      // console.log(value);
    }
    // console.log(best_hay);


    return best_hay;
  };


  // Throw away the start sequence, we know it's there.
  normalized_grouped_line.splice(0, group_sequence(barcode.ean13.start_sequence).length);

  for(var i = 0; i < 6; ++i) {
    var best_hay = get_next_match(normalized_grouped_line, barcode.ean13.encoding_['1b'][0]);
    best_hay = get_next_match(normalized_grouped_line, barcode.ean13.encoding_['1b'][1], best_hay);
    // console.log(best_hay);
    if(best_hay.error > 2) {
      return decoded;
    }
    decoded.push(best_hay.value);
    normalized_grouped_line.splice(0, best_hay.count);
  }

  // Throw away the intermediate sequence, we know it's there.
  normalized_grouped_line.splice(0, group_sequence(barcode.ean13.intermediate_sequence).length);

  for(var i = 0; i < 6; ++i) {
    var best_hay = get_next_match(normalized_grouped_line, barcode.ean13.encoding_['2']);
    // console.log(best_hay);
    if(best_hay.error > 2) {
      return decoded;
    }
    decoded.push(best_hay.value);
    normalized_grouped_line.splice(0, best_hay.count);
  }

  return decoded;

  // get_next_match(normalized_grouped_line, barcode.ean13.encoding_['1b'][1]);

  // First 6 digits.
  // for(var i = 0; i < 6; ++i) {
  //   for(var b = 0; b < 1; ++b) {

  //   }
  // }

  // for(var i = 0; i < 6; ++i) {
  //   var encoded_digit = encoded.splice(0, 7);
  //   for(var digit in barcode.ean13.encoding_['1b'][0]) {
  //     if(compare(encoded_digit, barcode.ean13.encoding_['1b'][0][digit]) === true) {
  //       decoded.push(digit);
  //       continue;
  //     }
  //   }
  //   for(var digit in barcode.ean13.encoding_['1b'][1]) {
  //     if(compare(encoded_digit, barcode.ean13.encoding_['1b'][1][digit]) === true) {
  //       decoded.push(digit);
  //       continue;
  //     }
  //   }
  // }



  return false;

  // if(encoded.length !== barcode.ean13.bytes) {
    // return [];
  // }

  // console.log(encoded);
  // debugger;
  var compare = function(a, b) {
    return a.join() === b.join();

    // if(a.length !== b.length) {
    //   return false;
    // }
    // for(var i = 0; i < a.length; ++i) {
    //   if(a[i] !== b[i]) {
    //     return false;
    //   }
    // }
    // return true;
  }



  var start = encoded.splice(0, 3);
  // console.log(start);

  var decoded = [];

  for(var i = 0; i < 6; ++i) {
    var encoded_digit = encoded.splice(0, 7);
    for(var digit in barcode.ean13.encoding_['1b'][0]) {
      if(compare(encoded_digit, barcode.ean13.encoding_['1b'][0][digit]) === true) {
        decoded.push(digit);
        continue;
      }
    }
    for(var digit in barcode.ean13.encoding_['1b'][1]) {
      if(compare(encoded_digit, barcode.ean13.encoding_['1b'][1][digit]) === true) {
        decoded.push(digit);
        continue;
      }
    }
    // console.log(encoded_digit);
  }

  var intermediate = encoded.splice(0, 5);
  // console.log(intermediate);

  for(var i = 0; i < 6; ++i) {
    var encoded_digit = encoded.splice(0, 7);
    for(var digit in barcode.ean13.encoding_['2']) {
      if(compare(encoded_digit, barcode.ean13.encoding_['2'][digit]) === true) {
        decoded.push(digit);
        continue;
      }
    }
    // console.log(encoded_digit);
  }

  var stop = encoded.splice(0, 3);
  // console.log(stop);

  // if(decoded.length === 12) {
    // alert(decoded);
  // }
  // console.log(decoded);

  return decoded;

  // TODO: CHECKSUM

  // var stop = encoded.splice(encoded.length - 3, 3);
  // console.log(stop);

  // // 2
  // for(var i = 5; i >= 0; --i) {
  //   var encoded_digit = encoded.splice(encoded.length - 7, 7);
  //   console.log(encoded_digit);
  // }


  // console.log('foo');
  // Check known areas
  // console.log(encoded.splice(encoded.length - 3, 3).join());
  // console.log(barcode.ean13.stop.join());
  // if(encoded.splice(0, 3).join() !== barcode.ean13.start.join()) {
  //   console.log('fail 1');
  //   return false;
  // }
  // if(encoded.splice(encoded.length - 3, 3).join() !== barcode.ean13.stop.join()) {
  //   console.log('fail 2');
  //   return false;
  // }




  // console.log('IT WORKED!');
  // console.log(encoded);
}


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
barcode.ean13.encode_part_1_ = function(string) {
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
barcode.ean13.encode_part_2_ = function(string) {
  var encoded = [];
  for (var i = 0; i < string.length; i++) {
    encoded = encoded.concat(this.encoding_['2'][string.charAt(i)]);
  }
  return encoded;
};
