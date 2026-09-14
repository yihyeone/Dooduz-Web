#!/usr/bin/env bash
set -euo pipefail

convert ../upload/IMG_1907.jpeg -crop 198x261+41+628 +repage -resize 424x558! -quality 86 images/flower-assets/card-yellow-striped-featherflower-20260914.webp
convert ../upload/IMG_1907.jpeg -crop 198x261+256+628 +repage -resize 424x558! -quality 86 images/flower-assets/card-dark-blue-featherflower-20260914.webp
convert ../upload/IMG_1908.png -crop 326x429+779+570 +repage -resize 424x558! -quality 86 images/flower-assets/card-light-pink-ixora-20260914.webp
convert ../upload/IMG_1909.png -crop 326x429+63+570 +repage -resize 424x558! -quality 86 images/flower-assets/card-sunglow-hypericum-20260914.webp
