


/**
 * @constructor
 *
 * http://book.realworldhaskell.org/read/barcode-recognition.html
 * http://www.google.com/patents/US20120091204
 * https://code.google.com/p/jjil/wiki/FindingTheBarcode
 * http://www.ijeset.com/media/0001/8I4-IJESET410-ROBUST-BARCODE.pdf (threshold)
 * http://www.math.tau.ac.il/~turkel/notes/otsu.pdf
 *
 * binarize
 * http://users.soe.ucsc.edu/~manduchi/papers/barcodes.pdf (long read, appears to argue against binarization. Uses some barcode detection)
 * http://www.researchgate.net/publication/224149969_Knowledge_guided_adaptive_binarization_for_2D_barcode_images_captured_by_mobile_phones (good but takes a long time)
 *
 */
barcode.reader.processor = function(canvas, opt_threshold) {
  this.canvas_ = canvas;
  this.context_ = this.canvas_.getContext('2d'); // Used a lot

  // Set some stuff.
  this.fixed_threshold_ = opt_threshold;
}


barcode.reader.processor.prototype.canvas_;
barcode.reader.processor.prototype.context_;
barcode.reader.processor.prototype.image_data_;
barcode.reader.processor.prototype.histogram_;
barcode.reader.processor.prototype.threshold_;
barcode.reader.processor.prototype.fixed_threshold_;


/**
 * Start processing the image
 */
barcode.reader.processor.prototype.process = function() {
  this.image_data_ = this.context_.getImageData(
    0,
    0,
    this.canvas_.width,
    this.canvas_.height
  );

  this.grayscale_();

  this.histogram_ = this.generate_histogram_();

  if(this.fixed_threshold_) {
    this.threshold_ = this.fixed_threshold_;
  }
  else {
    this.threshold_ = this.generate_threshold_(this.histogram_);
  }

  this.binarize_(this.threshold_);

  this.context_.putImageData(this.image_data_, 0, 0);
}


/**
 * Make the image grayscale.
 */
barcode.reader.processor.prototype.grayscale_ = function() {
  for(var i = 0; i < this.image_data_.data.length; i += 4) {
    var luminosity =
      0.2126 * this.image_data_.data[i] +
      0.7152 * this.image_data_.data[i + 1] +
      0.0722 * this.image_data_.data[i + 2]
    ;

    this.image_data_.data[i] = this.image_data_.data[i + 1] = this.image_data_.data[i + 2] = luminosity;
  }
}


/**
 * Binarize the already grayscale image around a threshold.
 */
barcode.reader.processor.prototype.binarize_ = function(threshold) {
  for (var i = 0; i < this.image_data_.data.length; i += 4) {
    var value = (this.image_data_.data[i] + this.image_data_.data[i + 1] + this.image_data_.data[i + 2] >= threshold) ? 255 : 0;
    this.image_data_.data[i] = this.image_data_.data[i+1] = this.image_data_.data[i+2] = value;
  }
}


/**
 * Get the histogram for the image.
 */
barcode.reader.processor.prototype.generate_histogram_ = function() {
  // http://stackoverflow.com/questions/1295584/most-efficient-way-to-create-a-zero-filled-javascript-array
  var histogram = Array.apply(null, new Array(256)).map(Number.prototype.valueOf, 0);

  for (var i = 0; i < this.image_data_.data.length; i += 4) {
    histogram[this.image_data_.data[i]]++;
  }

  return histogram;
}


/**
 * Get the histogram of the grayscale image.
 */
barcode.reader.processor.prototype.get_histogram = function() {
  return this.histogram_;
}


/**
 * Generate the threshold using the otsu method.
 * TODO: Clean up this function
 * http://en.wikipedia.org/wiki/Otsu%27s_method
 */
barcode.reader.processor.prototype.generate_threshold_ = function(histogram) {
/*  var get_weight = function(left_boundary, right_boundary) {
    var weight = 0;
    for(var i = left_boundary; i < right_boundary; ++i) {
      weight += histogram[i];
    }
    return weight;
  }

  var threshold, left_boundary, right_boundary, weight_left, weight_right;

  threshold = 128; // center of the weighing scale threshold
  left_boundary = 0;
  right_boundary = 255;
  weight_left = get_weight(left_boundary, threshold + 1); // weight on the left weight_left
  weight_right = get_weight(threshold + 1, right_boundary + 1); // weight on the right weight_right
  while (left_boundary <= right_boundary) {

   if (weight_right > weight_left) { // right side is heavier
     weight_right -= histogram[right_boundary--];
     if (((left_boundary + right_boundary) / 2) < threshold) {
       weight_right += histogram[threshold];
       weight_left -= histogram[threshold--];
     }
   } else if (weight_left >= weight_right) { // left side is heavier
     weight_left -= histogram[left_boundary++];
     if (((left_boundary + right_boundary) / 2) > threshold) {
       weight_left += histogram[threshold + 1];
       weight_right -= histogram[threshold + 1];
       threshold++;
     }
   }
  }
  return threshold;*/


// pretty quickly put together but has readable code with some comments and some stuff about parities
// https://github.com/pplanel/barcode/blob/master/barcode.js
	// normalize and convert to binary

		// var min = Math.min.apply(null, pixels);
		// var max = Math.max.apply(null, pixels);

		// for (var i = 0, ii = pixels.length; i < ii; i++) {
		// 	if (Math.round((pixels[i] - min) / (max - min) * 255) > config.threshold) {
		// 		binary.push(1);
		// 	} else {
		// 		binary.push(0);
		// 	}
		// }


  var total = this.canvas_.height * this.canvas_.width;

  var sum = 0;
  for (var i = 1; i < 256; ++i)
      sum += i * histogram[i];
  var sumB = 0;
  var wB = 0;
  var wF = 0;
  var mB;
  var mF;
  var max = 0.0;
  var between = 0.0;
  var threshold1 = 0.0;
  var threshold2 = 0.0;
  for (var i = 0; i < 256; ++i) {
      wB += histogram[i];
      if (wB == 0)
          continue;
      wF = total - wB;
      if (wF == 0)
          break;
      sumB += i * histogram[i];
      mB = sumB / wB;
      mF = (sum - sumB) / wF;
      between = wB * wF * Math.pow(mB - mF, 2);
      if ( between >= max ) {
          threshold1 = i;
          if ( between > max ) {
              threshold2 = i;
          }
          max = between;
      }
  }
  var threshold = ( threshold1 + threshold2 ) / 2.0;

  return threshold;
}


/**
 * Get the current threshold value.
 */
barcode.reader.processor.prototype.get_threshold = function() {
  return this.threshold_;
}


/**
 * Set the current threshold value.
 */
barcode.reader.processor.prototype.set_threshold = function(threshold) {
  this.threshold_ = threshold;
}