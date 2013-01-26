// redditListing jQuery Plugin
// Example usage: $('#ul').redditListing({type: "sr", value: "funny"});
//                $('#ul').redditListing('load');
(function($) {
    var methods = {
        init: function(options){
            //defaults
            return this.each(function(){
                var $this = $(this);
                var redditQuery;

                var settings = $.extend({
                    type: "sr",
                    value: "pics"
                    //afterLoad: function
                    //onItemActivate: function
                }, options);

                switch(settings.type) {
                    case 'search':
                        redditQuery = new RedditSearch(settings.value);
                        break;
                    case 'sr':
                        redditQuery = new RedditSubreddit(settings.value);
                        break;
                }

                var listingTemplate = Handlebars.compile($('#listing-template').html());

                $this.data('redditListing', {
                    settings: settings,
                    redditQuery: redditQuery,
                    listingTemplate: listingTemplate
                });

                $this.redditListing('load');
            });
        },

        load: function() {
            return this.each(function(){
                var $this = $(this);
                var data = $this.data('redditListing');

                $this.redditListing('setLoading', true);

                data.redditQuery.load(function(listingJSON) {
                    $this.redditListing('renderJSON', listingJSON.data);
                });

                if (data.settings.afterLoad) {
                    data.settings.afterLoad(data.settings.type, data.settings.value);
                };
            });
        },

        loadMore: function() {
            return this.each(function(){
                var $this = $(this);
                var data = $this.data('redditListing');

                $this.redditListing('setLoading', true);

                var lastItem = $this.children().last().data('name');

                data.redditQuery.load(function(listingJSON) {
                    $this.redditListing('renderJSON', listingJSON.data);
                    $this.redditListing('next');
                }, lastItem);

                if (data.settings.afterLoad) {
                    data.settings.afterLoad(data.settings.type, data.settings.value);
                };
            });
        },

        activateItem: function($li) {
            return this.each(function(){
                var $this = $(this);
                var data = $this.data('redditListing');

                $li.siblings().removeClass('active');
                $li.addClass('active');

                // scroll to active
                // $(window).scrollTop($li.offset().top - 47 - 24);
                $('html, body').stop(true).animate({scrollTop : ($li.offset().top - 47 - 36)}, 'slow');

                if (data.settings.onItemActivate) {
                    data.settings.onItemActivate($li);
                };
            });
        },

        renderJSON: function(json) {
            return this.each(function(){
                var $this = $(this);
                var data = $this.data('redditListing');

                $this.redditListing('setLoading', false);

                var listingHTML = data.listingTemplate(json);
                $this.append(listingHTML);
            });
        },

        setLoading: function(isLoading) {
            return this.each(function(){
                var $this = $(this);
                var data = $this.data('redditListing');

                if(data.spinner !== undefined && data.spinner.stop !== undefined) {
                    data.spinner.stop();
                }
                $('#spinner').hide().removeClass('active');

                if(isLoading) {
                    $('#spinner').show().addClass('active');
                    data.spinner = new Spinner(spinnerOpts).spin(document.getElementById('spinner'));
                }

                $this.data('redditListing', data);
            });
        },

        next: function() {
            return this.each(function(){
                var $this = $(this);
                var data = $this.data('redditListing');

                var $activeli = $this.find('li.active');
                var $nextli;

                if($activeli.length === 0) {
                    $nextli = $this.find('li').first();
                } else {
                    $nextli = $activeli.next();
                }
                if ($nextli.length > 0) {
                    $this.redditListing('activateItem', $nextli);
                } else {
                    //loadMore($activeli.parent(), next);
                    $this.redditListing('loadMore', $nextli);
                }
            });
        },

        prev: function() {
            return this.each(function(){
                var $this = $(this);
                var data = $this.data('redditListing');

                var $activeli = $this.find('li.active');
                var $nextli;

                if($activeli.length === 0) {
                    $nextli = $this.find('li').last();
                } else {
                    $nextli = $activeli.prev();
                }

                if ($nextli.length > 0) {
                    $this.redditListing('activateItem', $nextli);
                } 
            });
        }
    }

    $.fn.redditListing = function(method) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.redditListing' );
        }    
    };
})( jQuery );

