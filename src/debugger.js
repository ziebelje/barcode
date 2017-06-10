/**
 * A collection of debugging functions.
 */
barcode.debugger = function() {};

/**
 * Display a scan line in the center of the canvas. This is for looks only
 * although it's basically where the detector is looking at.
 */
barcode.debugger.prototype.draw_scan_line = function() {
  var line_width = 4;

  var x_start = 0;
  var x_end = this.canvas_.width;

  var y_start = Math.round(this.canvas_.height / 2);
  var y_end = y_start;

  var context = this.canvas_.getContext('2d');
  context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  context.beginPath();
  context.moveTo(x_start, y_start);
  context.lineTo(x_end, y_end);
  context.lineWidth = line_width;
  context.stroke();
};

/**
 * Draw a 10px high representation (for viewablity) of the single row of
 * pixels that was binarized.
 */
barcode.debugger.prototype.draw_binarized = function() {
  var height = 10;

  var context = this.canvas_.getContext('2d');
  for (var i = 0; i < height; i++) {
    context.putImageData(
      this.processor_.image_data_,
      0,
      Math.round(this.canvas_.height / 2) - (height / 2) + i
    );
  }
};

/**
 * Draw a purple rectangle covering the left-to-right bounds of the barcode;
 * this does not look up and down.
 */
barcode.debugger.prototype.draw_bounds = function() {
  if (this.reader_.bounds_ !== null) {
    var line_width = 10;

    var x_start = this.reader_.bounds_.start_pixel;
    var x_end = this.reader_.bounds_.stop_pixel;

    var y_start = Math.round(this.canvas_.height / 2);
    var y_end = y_start;

    var context = this.canvas_.getContext('2d');
    context.strokeStyle = 'rgba(128, 0, 128, 0.5)';
    context.beginPath();
    context.moveTo(x_start, y_start);
    context.lineTo(x_end, y_end);
    context.lineWidth = line_width;
    context.stroke();
  }
};

/**
 * Draw a green rectangle covering the left-to-right bounds of the barcode on
 * success.
 */
barcode.debugger.prototype.draw_success_line = function() {
  if (this.reader_.decoded_ !== null && this.reader_.decoded_ !== undefined) {
    var line_width = 10;

    var x_start = this.reader_.bounds_.start_pixel;
    var x_end = this.reader_.bounds_.stop_pixel;

    var y_start = Math.round(this.canvas_.height / 2);
    var y_end = y_start;

    var context = this.canvas_.getContext('2d');
    context.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    context.beginPath();
    context.moveTo(x_start, y_start);
    context.lineTo(x_end, y_end);
    context.lineWidth = line_width;
    context.stroke();
  }
};

barcode.debugger.prototype.draw_begin_sequences = function() {
  var begin_sequences = this.detector_.begin_sequences_;
  var context = this.canvas_.getContext('2d');
  for (var i = 0; i < begin_sequences.length; i++) {
    var begin_sequence = begin_sequences[i];

    var line_width = 5;

    var x_start = begin_sequence[0].start_pixel;
    var x_end = begin_sequence[begin_sequence.length - 1].stop_pixel;

    var y_start = Math.round(this.canvas_.height / 2) - (line_width / 2);
    var y_end = y_start;

    context.strokeStyle = 'rgba(255, 165, 0, 0.5)';
    context.beginPath();
    context.moveTo(x_start, y_start);
    context.lineTo(x_end, y_end);
    context.lineWidth = line_width;
    context.stroke();
  }
};

barcode.debugger.prototype.draw_end_sequences = function() {
  var end_sequences = this.detector_.end_sequences_;
  var context = this.canvas_.getContext('2d');
  for (var i = 0; i < end_sequences.length; i++) {
    var end_sequence = end_sequences[i];

    var line_width = 5;

    var x_start = end_sequence[0].start_pixel;
    var x_end = end_sequence[end_sequence.length - 1].stop_pixel;

    var y_start = Math.round(this.canvas_.height / 2) + (line_width / 2);
    var y_end = y_start;

    context.strokeStyle = 'rgba(0, 0, 255, 0.5)';
    context.beginPath();
    context.moveTo(x_start, y_start);
    context.lineTo(x_end, y_end);
    context.lineWidth = line_width;
    context.stroke();
  }
};

/**
 * Get various performance metrics for a particular barcode read.
 *
 * @return {Object}
 */
barcode.debugger.prototype.get_performance = function() {
  return {
    'timing': {
      'total': parseFloat(this.reader_.time_.toFixed(2)),
      'processor': parseFloat(this.processor_.time_.toFixed(2)),
      'detector': parseFloat(this.detector_.time_.toFixed(2)),
      'decoder': parseFloat(this.decoder_.time_.toFixed(2))
    }
  };
};

/**
 * Set the canvas.
 *
 * @param {HTMLCanvasElement} canvas
 *
 * @return {barcode.debugger}
 */
barcode.debugger.prototype.set_canvas = function(canvas) {
  this.canvas_ = canvas;

  return this;
};

/**
 * Set the reader.
 *
 * @param {barcode.reader} reader
 *
 * @return {barcode.debugger}
 */
barcode.debugger.prototype.set_reader = function(reader) {
  this.reader_ = reader;

  return this;
};

/**
 * Set the processor.
 *
 * @param {barcode.processor} processor
 *
 * @return {barcode.debugger}
 */
barcode.debugger.prototype.set_processor = function(processor) {
  this.processor_ = processor;

  return this;
};

/**
 * Set the detector.
 *
 * @param {barcode.detector} detector
 *
 * @return {barcode.debugger}
 */
barcode.debugger.prototype.set_detector = function(detector) {
  this.detector_ = detector;

  return this;
};

/**
 * Set the decoder.
 *
 * @param {barcode.decoder} decoder
 *
 * @return {barcode.debugger}
 */
barcode.debugger.prototype.set_decoder = function(decoder) {
  this.decoder_ = decoder;

  return this;
};
