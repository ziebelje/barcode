/**
 * @preserve Barcode generation/reading.
 *
 * This library is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public
 * License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library. If not, see <http://www.gnu.org/licenses/>.
 */



/**
 * Barcode generator.
 *
 * @constructor
 *
 * @abstract
 *
 * @const
 *
 * @namespace
 *
 * @param {{background_color: string, foreground_color: string, bar_width: number, bar_height: number, data: string}} options
 * A bunch of configurable stuff.
 */
var barcode = function(options) {
  // var defaults = {
  //   'background_color': '#ffffff',
  //   'foreground_color': '#000000',
  //   'bar_width': 2,
    // 'bar_height': 100
    //'margin': 0
  // };

  // TODO: Apply defaults.
  // options = rocket.extend(defaults, options);

  this.background_color_ = options.background_color;
  this.foreground_color_ = options.foreground_color;
  this.bar_width_ = options.bar_width;
  this.bar_height_ = options.bar_height;
  this.data_ = options.data;
};


/**
 * Background color of barcodes. Usually white.
 *
 * @private
 *
 * @type {string}
 */
barcode.prototype.background_color_;


/**
 * Foreground color of barcodes. Usually black.
 *
 * @private
 *
 * @type {string}
 */
barcode.prototype.foreground_color_;


/**
 * Pixel width of each byte in a bar code.
 *
 * @private
 *
 * @type {number}
 */
barcode.prototype.bar_width_;


/**
 * Pixel height of each bar.
 *
 * @private
 *
 * @type {number}
 */
barcode.prototype.bar_height_;


/**
 * The original data to be encoded.
 *
 * @private
 *
 * @type {string}
 */
barcode.prototype.data_;


/**
 * The canvas the barcode gets drawn on.
 *
 * @private
 *
 * @type {HTMLCanvasElement}
 */
barcode.prototype.canvas_;


/**
 * Get the canvas element that the barcode is drawn on.
 *
 * @return {HTMLCanvasElement}
 */
barcode.prototype.get_canvas = function() {
  return this.canvas_;
}


/**
 * Render the barcode into the parent container. This creates a canvas element
 * and attaches it to the parent element.
 *
 * @param {rocket.Elements} parent
 */
barcode.prototype.render = function(parent) {
  var canvas = document.createElement('canvas');

  // TODO: Can only really set these once the barcode is created...
  canvas.width = 200;
  canvas.height = 200;

  this.decorate(canvas);

  parent.appendChild(canvas);
};


/**
 * Decorate. If you already have a canvas element you would like to render a
 * barcode into, use this.
 *
 * @param {HTMLCanvasElement} canvas The canvas to draw on. This will be stored
 * in a class variable and exposed via get_canvas().
 */
barcode.prototype.decorate = function(canvas) {
  this.canvas_ = canvas;

  var encoded_data = this.encode();

  var context = /** @type {CanvasRenderingContext2D} */ (this.canvas_.getContext('2d'));

  for (var i = 0; i < encoded_data.length; ++i) {
    if (encoded_data[i] === 1) {
      context.fillStyle = 'rgb(0, 0, 0)'; // TODO: HEX?
    }
    else {
      context.fillStyle = 'rgb(255, 255, 255)';
    }
    context.fillRect(
        this.bar_width_ * i,
        0,
        this.bar_width_,
        this.bar_height_
    );
  }
};


/**
 * Encode barcode data.
 *
 * @return {Array.<number>}
 */
barcode.prototype.encode;


/**
 * Inheritance.
 *
 * @link https://github.com/nicklynj/rocket/blob/master/src/inherits.js
 */
barcode.inherits = function(child_class, parent_class) {
  /**
   * @ignore
   *
   * @constructor
   */
  function Temporary_Class() {};

  Temporary_Class.prototype = parent_class.prototype;

  child_class.prototype = new Temporary_Class();

  child_class.prototype.constructor = child_class;
  child_class.prototype.superClass_ = parent_class.prototype;
};
