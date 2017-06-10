/**
 * Decodes processed image data.
 */
barcode.decoder = function() {
  this.time_ = 0;
};

/**
 * Scales the widths of the full bars down to match the ideal case of "one
 * pixel per bit". For example, a start sequence of [1, 0, 1] might be
 * threebars each with a width of 20px in the actual image. This will scale
 * thosewidths down to 1px each (more or less).
 *
 * @param {Array.<Objec>} bars
 * @param {number} bits
 *
 * @return {Array.<Object>}
 */
barcode.decoder.prototype.get_normalized_bars_ = function(bars, bits) {
  var width = 0;
  for (var i = 0; i < bars.length; i++) {
    width += bars[i].width;
  }

  var pixels_per_bit = width / bits;
  bars.map(function(element) {
    element.width /= pixels_per_bit;

    return element;
  });

  return bars;
};

barcode.decoder.prototype.foo = 'bar';
