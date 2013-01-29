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
    events: {
        "mouseenter" : "show",
        "mouseleave" : "hide"
    },

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
    },

    show: function() {
        if (this.$el.children().length > 0)
            this.$el.addClass('active');
    },

    hide: function() {
        this.$el.removeClass('active');
    }
});


var redditListingView = Backbone.View.extend({
    events: {
        "click .listing__item__link": function(e) {
            e.preventDefault();
            this.activateItem($(e.target).closest('li'));
        }
    },

    options: {
        type: "sr",
        value: "pics"
    },

    initialize: function() {
        // initialize storage
        this.visited = []; 
        if(Modernizr.localstorage) {
            if(localStorage.visited) {
                this.visited = JSON.parse(localStorage.visited); 

                // trim
                if (this.visited.length > 400) {
                    this.visited = visited.slice(100);
                }
            } else {
                localStorage.visited = [];
            }
        }

        // create Query object
        switch(this.options.type) {
            case 'search':
                this.redditQuery = new RedditSearch(this.options.value);
                break;
            case 'sr':
                this.redditQuery = new RedditSubreddit(this.options.value);
                break;
        }

        // compile Template
        this.listingTemplate = Handlebars.compile($('#listing-template').html());

        this.load();
    },


    markVisited: function(id) {
        var $li = this.$("[data-name=" + id + "]");
        $li.addClass('visited');

        // save new visited links
        if(this.visited.indexOf(id) == -1) {
            this.visited.push(id);
        } 
        if(Modernizr.localstorage) {
            localStorage.visited = JSON.stringify(this.visited);
        }
    },


    load: function() {
        var me = this;

        this.setLoading(true);

        this.redditQuery.load(function(listingJSON) {
            me.renderJSON(listingJSON.data);

            if (me.options.afterLoad) {
                me.options.afterLoad(me.options.type, me.options.value);
            }

            // mark all items present in visited-storage
            me.$('li').each(function() {
                if (me.visited.indexOf($(this).data('name')) != -1) {
                    $(this).addClass('visited');
                }
            });
        });
    },


    loadMore: function() {
        var me = this;
        this.setLoading(true);

        var lastItem = this.$('li').last().data('name');

        data.redditQuery.load(function(listingJSON) {
            me.renderJSON(listingJSON.data);
            me.next();

            if (me.options.afterLoad) {
                me.options.afterLoad(me.options.type, me.options.value);
            }

            // mark all items present in visited-storage
            me.$('li').each(function() {
                if (me.visited.indexOf($(this).data('name')) != -1) {
                    $(this).addClass('visited');
                }
            });

        }, lastItem);
    },


    activateItem: function($li) {
        var me = this;

        $li.siblings().removeClass('active');
        $li.addClass('active');

        // scroll to active
        $('html, body').stop(true).animate({scrollTop : ($li.offset().top - 47 - 36)}, 'slow');

        if (me.options.onItemActivate) {
            me.options.onItemActivate($li);
        }

        this.markVisited($li.data('name'));
    },

    renderJSON: function(json) {
        this.setLoading(false);

        var listingHTML = this.listingTemplate(json);
        this.$el.append(listingHTML);
    },


    setLoading: function(state) {
        if(this.spinner !== undefined && this.spinner.stop !== undefined) {
            this.spinner.stop();
        }
        $('#spinner').hide().removeClass('active');

        if(state) {
            $('#spinner').show().addClass('active');
            this.spinner = new Spinner(spinnerOpts).spin(document.getElementById('spinner'));
        }
    },


    next: function() {
        var $activeli = this.$('li.active');
        var $nextli;

        if($activeli.length === 0) {
            $nextli = this.$('li').first();
        } else {
            $nextli = $activeli.next();
        }
        if ($nextli.length > 0) {
            this.activateItem($nextli);
        } else {
            this.loadMore();
        }
    },


    prev: function() {
        var $activeli = this.$('li.active');
        var $nextli;

        if($activeli.length === 0) {
            $nextli = this.$('li').last();
        } else {
            $nextli = $activeli.prev();
        }

        if ($nextli.length > 0) {
            this.activateItem($nextli);
        } 
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
    var listing;

    var trackView = function(path) {
        if (_gaq !== null) {
            //console.log("gaq");
            _gaq.push(['_trackPageview', location.pathname  + path]);
        } else {
            console.log("no gaq found");
        }
    }

    var openSubreddit = function(sr) {
        /*
        $listing = $('<ul class="listing">')
            .redditListing($.extend({type:"sr", value:sr}, defaultRedditSettings))
            .appendTo($('#results').empty());
            */

        var $ul = $('<ul class="listing">').appendTo($('#results').empty());
        listing = new redditListingView($.extend({ el: $ul, type:"sr", value:sr }, defaultRedditSettings));
        console.log(listing);

        $('#browser').removeClass('active');
    }

    var openSearch = function(q) {
        /*
        $listing = $('<ul class="listing">')
            .redditListing($.extend({type:"search", value:q}, defaultRedditSettings))
            .appendTo($('#results').empty());
            */
        var $ul = $('<ul class="listing">').appendTo($('#results').empty());
        listing = new redditListingView($.extend({ el: $ul, type:"search", value:q }, defaultRedditSettings));

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

    $(document).on('click', 'a.internal', function(e){
        e.preventDefault();
        browser.openLink($(this));
    });

    $(document).on('keydown', function(e){
        switch(e.which) {
            case 40:
                listing.next();
                e.preventDefault();
                break;
            
            case 38:
                listing.prev();
                e.preventDefault();
                break;

            case 39:
                browser.hide();
                e.preventDefault();
                break;
            
            case 37:
                browser.show();
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

