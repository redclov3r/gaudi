Handlebars.registerHelper("debug", function(optionalValue) { 
    console.log("Current Context"); 
    console.log("===================="); 
    console.log(this);   
    if (optionalValue) { 
        console.log("Value"); 
        console.log("===================="); 
        console.log(optionalValue); 
    } 
});

Handlebars.registerHelper("date", function(secondsUTC) { 
    var now = new Date();
    var millisecondsUTC = secondsUTC * 1000;
    var millisecondsDiff = now.getTimezoneOffset() * 60 * 1000;
    var milliseconds = millisecondsUTC - millisecondsDiff;
    var difference = (now.getTime() - milliseconds);

    var differenceMinutes = difference / (60 * 1000);

    if (differenceMinutes > (60 * 24)) {
        return Math.round(differenceMinutes / (60 * 24)) + " days ago";
    }

    if (differenceMinutes > 60) {
        return Math.round(differenceMinutes / 60) + " hours ago";
    }

    return Math.round(differenceMinutes)  + " minutes ago";
});

var history_enabled = true;
history_enabled = !!(window.history && history.pushState) && history_enabled;


var spinnerOpts = {
    lines: 17,
    length: 4,
    radius: 17,
    corners: 1,
    trail: 100,
    color: "#8D8674"
};


var Browser = Backbone.View.extend({
    setLoading: function(state) {
        if(state) {
            this.spinner = new Spinner(spinnerOpts).spin(this.el);
        } else {
            if(this.spinner !== undefined && this.spinner.stop !== undefined) {
                this.spinner.stop();
            }
        }
    },

    load: function(url) {
        var me = this;
        this.setLoading(true);

        this.$el.empty().addClass('active');
        
        // test for an image
        // TODO: redo extension checking in a clean way
        var imageExtensions = {
            ".jpg":1,
            "jpeg":1,
            ".png":1
        };

        if (url.substr(-4) in imageExtensions) {
            var $image = $('<img />');
            $image.attr('src',url);
            $image.appendTo(this.el);

            $image.on('load', function() {
                me.setLoading(false);
            });
        } else {
            var $iframe = $('<iframe></iframe>');

            $iframe.on('load', function() {
                me.setLoading(false);
            });

            $iframe.appendTo(this.el);
            $iframe.get(0).src = url;
        }
    },

    openLink: function($a) {
        this.load($a.attr('href'));
    }
});



$(function() {
    browser = new Browser({el: $('#browser')});

    var defaultRedditSettings = {
        afterLoad: function(type, value) {
            var path;
            var state = {};
            switch(type) {
                case 'sr':
                    path = "/r/" + value;
                    state = {type: "subreddit", sr: value};
                    break;
                case 'search':
                    path = "/s/" + value;
                    state = {type: "search", q: value};
                    break;
            }
            trackView(path);
            if(history_enabled) {
                window.history.pushState(state, path, "#" + path);
            } 
        },
        onItemActivate: function($li) {
            browser.openLink($li.find('a.listing__item__link'));
        }
    }
    var $listing;

    var trackView = function(path) {
        if (_gaq !== null) {
            //console.log("gaq");
            _gaq.push(['_trackPageview', location.pathname  + path]);
        } else {
            console.log("no gaq found");
        }
    }

    var openSubreddit = function(sr) {
        $listing = $('<ul class="listing">')
            .redditListing($.extend({type:"sr", value:sr}, defaultRedditSettings))
            .appendTo($('#results').empty());

        $('#browser').removeClass('active');
    }

    var openSearch = function(q) {
        $listing = $('<ul class="listing">')
            .redditListing($.extend({type:"search", value:q}, defaultRedditSettings))
            .appendTo($('#results').empty());

        $('#browser').removeClass('active');
    }

    var loadMore = function ($ul, callback) {
        var subreddit = $ul.data("subreddit");
        var lastItem = $ul.children('li').last().data("name");
        openSubreddit(subreddit, lastItem, true, callback, false);
    }


    $(document).on('click', '#search-btn', function(e) {
        e.preventDefault();
        var q = $('#search').val();
        if (q === "") {
            q = "funny gifs";
        }
        openSearch(q);
    });

    $("#open-btn").on('click', function(e) {
        e.preventDefault();
        var sr = $('#subreddit').val();
        if (sr === "") {
            sr = "pics";
        }
        openSubreddit(sr);
    });

    $(document).on('mouseenter', '#browser', function(e){
        if ($('#browser').children().length > 0)
            $('#browser').addClass('active');
    });

    $(document).on('mouseleave', '#browser', function(e){
        $('#browser').removeClass('active');
    });

    $(document).on('click', 'a.internal', function(e){
        e.preventDefault();
        browser.openLink($(this));
    });

    $(document).on('click', '.listing__item__link', function(e){
        e.preventDefault();
        $listing.redditListing('activateItem', $(this).closest('li'));
    });

    $(document).on('keydown', function(e){
        switch(e.which) {
            case 40:
                $listing.redditListing('next');
                e.preventDefault();
                break;
            
            case 38:
                $listing.redditListing('prev');
                e.preventDefault();
                break;

            case 39:
                $('#browser').removeClass('active');
                e.preventDefault();
                break;
            
            case 37:
                $('#browser').addClass('active');
                e.preventDefault();
                break;
            
            default:
        }
    });

    var indexContent = $('#results').html();
    
    if(history_enabled) {
        window.onpopstate = function(e){
            /*
            if(e.state && e.state.type == "subreddit") {
                openSubreddit(e.state.sr);
            } 
            if(e.state && e.state.type == "search") {
                openSearch(e.state.q);
            } 
            */
            if(document.location.hash.substr(1,3) == "/r/") {
                var subreddit = document.location.hash.substr(4);
                openSubreddit(subreddit);
            } else if(document.location.hash.substr(1,3) == "/s/") {
                var q = document.location.hash.substr(4);
                openSearch(q);
            } else if(document.location.hash.substr(1,3) === "") {
                // open homepage
                $('#results').html(indexContent);
            }
        };

        /*
        if (document.location.hash !== "") {
            if (document.location.hash.substr(1,3) == "/r/") {
                var subreddit = document.location.hash.substr(4);
                openSubreddit(subreddit);
            }
        }
        */
    }
});

