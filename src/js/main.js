(() => {
    'use strict';

    $(document).ready(() => {
        let owlCarouselInit = () => {
            $(".owl-carousel").each((index, element) => {

                let items = Math.min($(element).children().length, 5);

                $(element).owlCarousel({
                    autoPlay: 3000,
                    rewind: true,
                    margin: 10,
                    nav: true,
                    navText: ["<i class='icon-chevron-left fa-3x carousel__icon-left'>&lt</i>", "<i class='icon-chevron-left fa-3x carousel__icon-right'>&gt</i>"],
                    responsive: {
                        0: {
                            items: 2
                        },
                        768: {
                            items: 3
                        },
                        1024: {
                            items: items
                        }
                    }
                });

            });
        }
        owlCarouselInit();
    });
})();