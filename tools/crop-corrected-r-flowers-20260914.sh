#!/usr/bin/env bash
set -euo pipefail

convert ../upload/IMG_1914.jpeg -crop 312x411+53+34 +repage -resize 424x558! -quality 88 images/flower-assets/card-yellow-striped-featherflower-r-20260914.webp
convert ../upload/IMG_1917.jpeg -crop 313x412+50+27 +repage -resize 424x558! -quality 88 images/flower-assets/card-dark-blue-featherflower-r-20260914.webp
convert ../upload/IMG_1915.jpeg -crop 312x411+52+26 +repage -resize 424x558! -quality 88 images/flower-assets/card-light-pink-ixora-r-20260914.webp
convert ../upload/IMG_1916.jpeg -crop 322x424+56+29 +repage -resize 424x558! -quality 88 images/flower-assets/card-sunglow-hypericum-r-20260914.webp
convert ../upload/IMG_1918.jpeg -crop 312x411+52+26 +repage -resize 424x558! -quality 88 images/flower-assets/card-light-pink-sea-lavender-r-20260914.webp
