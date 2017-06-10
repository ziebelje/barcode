/**
 * Top-level barcode namespace.
 */
var barcode = {};

/**
 * Extends one class with another.
 *
 * @link https://oli.me.uk/2013/06/01/prototypical-inheritance-done-right/
 *
 * @param {Function} destination The class that should be inheriting things.
 * @param {Function} source The parent class that should be inherited from.
 *
 * @return {Object} The prototype of the parent.
 */
barcode.extend = function(destination, source) {
  destination.prototype = Object.create(source.prototype);
  destination.prototype.constructor = destination;

  return source.prototype;
};

/**
 * Convert an array sequence like [1, 0, 0] into a data format that's a little
 * more accessible for the search algorithm. All consecutive bits in a
 * sequence get grouped together into an objects like {'width': 5, 'value': 0}
 * and then put into an array that is returned. Both the detector and decoders
 * use this.
 *
 * @param {Array.<number>} sequence
 *
 * @return {Array.<Object>}
 */
barcode.group_sequence = function(sequence) {
  var current = {
    'value': sequence[0],
    'width': 0
  };
  var groups = [];

  for (var i = 0; i < sequence.length; ++i) {
    if (sequence[i] !== current.value) {
      groups.push(current);
      current = {
        'value': sequence[i],
        'width': 0
      };
    }
    current.width++;
  }
  groups.push(current);

  return groups;
};
