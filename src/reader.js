


/**
 * Barcode reader. This class is responsible for controlling the reader,
 * outputting any necessary information to the browser, and abstracting away
 * some details (like if the source is a video or a canvas element) to make the
 * processor simpler.
 *
 * @constructor
 */
barcode.reader = function(options) {
  // Store the source and detect the type ('canvas' or 'video').
  this.source_ = options.source;
  this.source_type_ = (Object.prototype.toString.call(this.source_)
    .match(/^\[object HTML(Video|Canvas)Element\]/))[1]
    .toLowerCase();

  // Create an internal canvas to work on and store it and the context.
  this.canvas_ = document.createElement('canvas');
  this.context_ = this.canvas_.getContext('2d');

  // How frequently to process when the source is a video.
  this.interval_ = options.interval;

  // This stuff does the actual work.
  this.processor_ = new barcode.reader.processor(this.canvas_, options.threshold);
  this.detector_ = new barcode.reader.detector(this.canvas_);
}


// TODO: Document this stuff
barcode.reader.prototype.source_;
barcode.reader.prototype.source_type_;
barcode.reader.prototype.canvas_;
barcode.reader.prototype.context_;
barcode.reader.prototype.interval_;
barcode.reader.prototype.interval_id_;
barcode.reader.prototype.processor_;
barcode.reader.prototype.detector_;


/**
 * For video input, attempt to capture at the configured interval length. For
 * canvas input, do a single capture.
 */
barcode.reader.prototype.start = function() {
  this.show_canvas_();

  if(this.source_type_ === 'video') {
    var self = this;
    this.interval_id_ = setInterval(
      function() {
        self.copy_source_();
        self.processor_.process();
        self.detector_.detect();
        self.show_histogram_();
        self.show_threshold_();
        self.show_scan_line_();
        self.show_sequences_();
      },
      this.interval_
    );
  }
  else if(this.source_type_ === 'canvas') {
    this.copy_source_();
    this.processor_.process();
    this.detector_.detect();
    // this.show_histogram_();
    // this.show_threshold_();
    this.show_scan_line_();
    this.show_sequences_();
  }
}


/**
 * Stop capturing. Both video and canvas captures can use this as it will also
 * hide the internal canvas if it was displayed.
 */
barcode.reader.prototype.stop = function() {
  clearInterval(this.interval_id_);
  this.hide_canvas_();
}


/**
 * Show the internal canvas.
 *
 * TODO: Only call this if there is a reason to show it, like wanting to display
 * certain visiual effects often just for debugging.
 */
barcode.reader.prototype.show_canvas_ = function() {
  this.source_.parentNode.appendChild(this.canvas_);

  if(this.source_type_ === 'video') {
    console.log('w=' + this.source_.videoWidth + ' h=' + this.source_.videoHeight);

    this.canvas_.width = this.source_.videoWidth;
    this.canvas_.height = this.source_.videoHeight;
  }
  else if(this.source_type_ === 'canvas') {
    this.canvas_.width = this.source_.width;
    this.canvas_.height = this.source_.height;
  }

  var rect = this.source_.getBoundingClientRect();
  this.canvas_.style.position = 'absolute';
  this.canvas_.style.left = rect.left + 'px';
  this.canvas_.style.top = rect.top + 'px';
}


/**
 * Remove the internal canvas from the DOM.
 */
barcode.reader.prototype.hide_canvas_ = function() {
  this.canvas_.parentNode.removeChild(this.canvas_);
}


/**
 * Copy the source canvas or current source video frame into the internal canvas.
 */
barcode.reader.prototype.copy_source_ = function() {
  this.context_.drawImage(
    this.source_,
    0,
    0,
    this.canvas_.width,
    this.canvas_.height
  );
}


/**
 * Display the histogram of the grayscaled image on the internal canvas.
 */
barcode.reader.prototype.show_histogram_ = function() {
  var histogram = this.processor_.get_histogram();
  var scale = (this.canvas_.height / 2 ) / Math.max.apply(null, histogram);

  for(var i = 0; i < histogram.length; ++i) {
    this.context_.strokeStyle = '#ff0000';
    this.context_.beginPath();
    this.context_.moveTo(i, this.canvas_.height);
    this.context_.lineTo(i, (this.canvas_.height - histogram[i] * scale));
    this.context_.lineWidth = 1;
    this.context_.stroke();
  }
}


/**
 * Display the threshold value on the internal canvas.
 */
barcode.reader.prototype.show_threshold_ = function() {
  var threshold = this.processor_.get_threshold();

  this.context_.strokeStyle = '#ff0000';
  this.context_.beginPath();
  this.context_.moveTo(threshold, 0);
  this.context_.lineTo(threshold, this.canvas_.height);
  this.context_.lineWidth = 3;
  this.context_.stroke();
}


/**
 * Display a scan line in the center of the canvas. This is for looks only
 * although it's basically where the detector is looking at.
 */
barcode.reader.prototype.show_scan_line_ = function() {
  this.context_.strokeStyle = '#ff0000';
  this.context_.beginPath();
  this.context_.moveTo(0, Math.round(this.canvas_.height / 2));
  this.context_.lineTo(this.canvas_.width, Math.round(this.canvas_.height / 2));
  this.context_.lineWidth = 1;
  this.context_.stroke();
}


/**
 * Draw lines on any detected special sequence (like start/stop). Lines are
 * drawn in the center of the canvas on top of the scan line.
 */
barcode.reader.prototype.show_sequences_ = function() {
  var sequences = this.detector_.get_sequences();

  for(var i = 0; i < sequences.length; ++i) {
    this.context_.strokeStyle = '#ff0000';
    this.context_.beginPath();
    this.context_.moveTo(sequences[i][0].start, Math.round(this.canvas_.height / 2));
    this.context_.lineTo(sequences[i][sequences[i].length-1].stop, Math.round(this.canvas_.height / 2));
    this.context_.lineWidth = 5;
    this.context_.stroke();
  }
}