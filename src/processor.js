/**
 * Processes the source image in preparation for barcode detection. This is
 * basically responsible for getting an array of 1's and 0's representing the
 * barcode data. For now the assumption is made that the barcode is in the
 * center of the image. No attempt is made to look around the image for it.
 *
 * @link http://book.realworldhaskell.org/read/barcode-recognition.html
 * @link http://www.google.com/patents/US20120091204
 * @link https://code.google.com/p/jjil/wiki/FindingTheBarcode
 * @link http://www.ijeset.com/media/0001/8I4-IJESET410-ROBUST-BARCODE.pdf
 * @link http://www.math.tau.ac.il/~turkel/notes/otsu.pdf
 */
barcode.processor = function() {};

/**
 * Process the image by grayscaling it, then binarizing it (black/white).
 *
 * @param {HTMLCanvasElement} canvas
 *
 * @return {Array.<number>} The canvas image data of the binarized pixel row.
 */
barcode.processor.prototype.process = function(canvas) {
  var time_start = performance.now();

  // Gets a 1px high line in the middle of the image for processing. No need to
  // process the entirety of the image as only a sampling of a 1D barcode is
  // necessary to read it. This is also super fast.
  var context = canvas.getContext('2d');
  this.image_data_ = context.getImageData(
    0,
    Math.round(canvas.height / 2),
    canvas.width,
    1
  );

  // Grayscale the image data.
  this.image_data_ = this.grayscale_(this.image_data_);

  // Generate a histogram from the grayscaled data.
  var histogram = this.generate_histogram_(this.image_data_);

  // Generate a threshold using that histogram.
  var threshold = this.generate_threshold_(this.image_data_, histogram);

  // Binarize the grayscaled image around said threshold.
  this.image_data_ = this.binarize_(this.image_data_, threshold);

  var time_end = performance.now();
  this.time_ = time_end - time_start;

  // Return collapsed image data.
  return this.collapse_image_data_(this.image_data_);
};

/**
 * Make the image grayscale. This will convert every pixel to a pixel with R
 * === G === B === (weighted average of the original values). Range will still
 * be between 0 and 255.
 *
 * @param {ImageData} image_data Image data from the canvas context.
 *
 * @return {ImageData} Grayscaled image data.
 */
barcode.processor.prototype.grayscale_ = function(image_data) {
  for (var i = 0; i < image_data.data.length; i += 4) {
    var luminosity =
      (0.2126 * image_data.data[i]) +
      (0.7152 * image_data.data[i + 1]) +
      (0.0722 * image_data.data[i + 2])
    ;

    image_data.data[i] = luminosity;
    image_data.data[i + 1] = luminosity;
    image_data.data[i + 2] = luminosity;
  }

  return image_data;
};

/**
 * Get the histogram for the image. This is simply a 256-width array where the
 * index is the luminosity value and the value is the count of the pixels
 * having that luminosity.
 *
 * @param {ImageData} image_data Grayscale image data from the canvas context.
 *
 * @return {Array.<number>}
 */
barcode.processor.prototype.generate_histogram_ = function(image_data) {
  // http://stackoverflow.com/questions/1295584/most-efficient-way-to-create-a-zero-filled-javascript-array
  var histogram = Array
    .apply(null, new Array(256))
    .map(Number.prototype.valueOf, 0);

  for (var i = 0; i < image_data.data.length; i += 4) {
    histogram[image_data.data[i]]++;
  }

  return histogram;
};

/**
 * Generate the threshold using the otsu method. Basically a copy/paste. :)
 *
 * @param {ImageData} image_data
 * @param {Array.<number>} histogram
 *
 * @link http://en.wikipedia.org/wiki/Otsu%27s_method
 *
 * @return {number}
 */
barcode.processor.prototype.generate_threshold_ = function(
  image_data,
  histogram
) {
  // Total number of pixels
  var total = image_data.data.length / 4;

  var sum = 0;
  for (var i = 1; i < 256; ++i) {
    sum += i * histogram[i];
  }

  var sumB = 0;
  var wB = 0;
  var wF = 0;
  var mB;
  var mF;
  var max = 0.0;
  var between = 0.0;
  var threshold_1 = 0.0;
  var threshold_2 = 0.0;

  for (var j = 0; j < 256; ++j) {
    wB += histogram[j];
    if (wB === 0) {
      continue;
    }
    wF = total - wB;
    if (wF === 0) {
      break;
    }
    sumB += j * histogram[j];
    mB = sumB / wB;
    mF = (sum - sumB) / wF;
    between = wB * wF * Math.pow(mB - mF, 2);
    if (between >= max) {
      threshold_1 = j;
      if (between > max) {
        threshold_2 = j;
      }
      max = between;
    }
  }

  return (threshold_1 + threshold_2) / 2.0;
};

/**
 * Binarize the already grayscale image around a threshold. Note that this
 * does not properly support transparency...so don't do it. The most common
 * use case (a video image) would not have this.
 *
 * @param {ImageData} image_data
 * @param {number} threshold
 *
 * @link http://users.soe.ucsc.edu/~manduchi/papers/barcodes.pdf
 * @link http://www.researchgate.net/publication/224149969_Knowledge_guided_adaptive_binarization_for_2D_barcode_images_captured_by_mobile_phones
 *
 * @return {ImageData} Binarized image data.
 */
barcode.processor.prototype.binarize_ = function(image_data, threshold) {
  for (var i = 0; i < image_data.data.length; i += 4) {
    var value = ((
      image_data.data[i]
    ) >= threshold) ? 255 : 0;

    image_data.data[i] = value;
    image_data.data[i + 1] = value;
    image_data.data[i + 2] = value;
  }

  return image_data;
};

/**
 * Collapse the RGBA data in the ImageData object into a single value per
 * pixel. Black pixels are 1 and white pixels are 0.
 *
 * @param {ImageData} image_data
 *
 * @return {Array.<number>}
 */
barcode.processor.prototype.collapse_image_data_ = function(image_data) {
  var collapsed_image_data = [];

  for (var i = 0; i < image_data.data.length; i += 4) {
    collapsed_image_data.push(image_data.data[i] === 0 ? 1 : 0);
  }

  return collapsed_image_data;
};
