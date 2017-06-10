/**
 * Reads barcodes. The important work (processing, detecting, and decoding) is
 * split up into chunks in separate classes. This just aggregates all that and
 * abstracts away the source type.
 */
barcode.reader = function() {
  // Create an internal canvas to work on.
  this.canvas_ = document.createElement('canvas');

  // Processes the image (grayscale, threshold, binarize).
  this.processor_ = new barcode.processor();

  // Finds the barcode in the image.
  this.detector_ = new barcode.detector();

  // Allows outputting useful debugging info onto the internal canvas.
  this.debugger_ = new barcode.debugger()
    .set_canvas(this.canvas_)
    .set_reader(this)
    .set_processor(this.processor_)
    .set_detector(this.detector_);
};

/**
 * Interval in ms between read attempts when the source is a video.
 *
 * @type {Number}
 */
barcode.reader.prototype.interval_ = 50;

/**
 * Sets the input source.
 *
 * @param {HTMLCanvasElement|HTMLVideoElement} source Input source.
 *
 * @return {barcode.reader}
 */
barcode.reader.prototype.set_source = function(source) {
  this.source_ = source;
  this.set_source_type_();

  return this;
};

/**
 * Set the symbology of the barcode being read.
 *
 * @param {string} symbology The type of barcode (ex: EAN13).
 *
 * @return {barcode.reader}
 */
barcode.reader.prototype.set_symbology = function(symbology) {
  this.symbology_ = symbology;

  return this;
};

/**
 * For video input, attempt to capture at the configured interval length. For
 * canvas input, do a single capture.
 *
 * @param {Function} callback Function to call after an attempt is made at
 * detecting the barcode. For canvas sources this will execute once. For video
 * sources this will execute once every interval. The value of the argument
 * passed to the callback function will reflect whether or not the scan was a
 * success and what, if anything, the data is.
 */
barcode.reader.prototype.start = function(callback) {
  var self = this;

  var f = function() {
    var time_start = performance.now();
    self.copy_source_to_internal_canvas_();
    var collapsed_image_data = self.processor_.process(self.canvas_);
    var detected = self.detector_.detect(
      collapsed_image_data,
      self.symbology_
    );
    for (var i = 0; i < detected.length; i++) {
      var decoder = new barcode.decoder[detected[i].symbology]();
      self.debugger_.set_decoder(decoder);
      self.decoded_ = decoder.decode(detected[i].data);
      if (self.decoded_ !== null) {
        self.bounds_ = detected[i].bounds;
        break;
      }
    }

    var time_end = performance.now();
    self.time_ = time_end - time_start;
    callback(self.decoded_);
  };

  if (this.source_type_ === 'video') {
    this.interval_id_ = setInterval(
      f,
      this.interval_
    );
  } else if (this.source_type_ === 'canvas') {
    f();
  }
};

/**
 * Stop capturing. Only relevant for video captures.
 */
barcode.reader.prototype.stop = function() {
  clearInterval(this.interval_id_);
};

/**
 * Get the internal canvas. This is useful if you want to display any
 * debugging overlays as they are drawn on the internal canvas.
 *
 * @return {HTMLCanvasElement} The internal canvas.
 */
barcode.reader.prototype.get_canvas = function() {
  return this.canvas_;
};

/**
 * Call one of the debugger functions.
 *
 * @param {string} func Name of the debugger function.
 *
 * @return {mixed} Whatever the debugger function returns, if anything.
 */
barcode.reader.prototype.debug = function(func) {
  return this.debugger_[func]();
};

/**
 * Copy the source canvas or current source video frame into the internal
 * canvas. The internal canvas is just a convenient place to work. For videos
 * it's necessary to have a format that can be processed. For canvas sources
 * it's not necessary but it makes sense to keep everything uniform.
 */
barcode.reader.prototype.copy_source_to_internal_canvas_ = function() {
  var context = this.canvas_.getContext('2d');
  context.drawImage(
    this.source_,
    0,
    0,
    this.canvas_.width,
    this.canvas_.height
  );
};

/**
 * Sets the input source type (video/canvas).
 */
barcode.reader.prototype.set_source_type_ = function() {
  this.source_type_ = (Object.prototype.toString.call(this.source_)
    .match(/^\[object HTML(Video|Canvas)Element\]/))[1]
    .toLowerCase();
};
