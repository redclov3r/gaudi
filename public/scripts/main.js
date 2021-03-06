// ==================================================== //
// gaudi main JavaScript
//
// based on Backbone.js and jQuery
// ==================================================== //

// ---------------------------------------------------- //
// Templating helpers 
// ---------------------------------------------------- //

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

// ---------------------------------------------------- //
// Defaults
// ---------------------------------------------------- //

var spinnerOpts = {
    lines: 17,
    length: 4,
    radius: 17,
    corners: 1,
    trail: 100,
    color: "#8D8674"
};

// ---------------------------------------------------- //
// Models 
// ---------------------------------------------------- //

var RedditPost = Backbone.Model.extend({});

/* TODO: maybe replace Collection with Paginator */
var RedditListing = Backbone.Collection.extend({
    model: RedditPost,
    options: { 
        step: 25,
        max: 100
    },
    params: {
        limit: 0
    },
    initialize: function(options) {
        this.options = _.extend(this.options, options);

        this.params.limit = this.options.step;
    },
    more: function() {
        this.params.limit += this.options.step;
        if (this.params.limit > this.options.max) {
            this.params.limit = this.options.step;
            this.params.after = this.last_item;
        }

        this.fetch({update: true});
    },
    parse: function(response) {
        // set the last element for the next call
        this.last_item = response.data.after;
        return response.data.children;
    },
    getTitle: function() {
        return "Reddit Listing";
    },
    getQueryString: function(params) {
        var parameters = _.extend(this.params, params);
        return $.param(parameters) + "&jsonp=?";
    }
});

var SubredditListing = RedditListing.extend({
    url: function() {
        var qstring = this.getQueryString();
        return "http://reddit.com/r/" + this.options.subreddit + "/hot.json?" + qstring;
    },
    getTitle: function() {
        return "/r/" + this.options.subreddit;
    }
});

var SearchListing = RedditListing.extend({
    url: function() {
        var qstring = this.getQueryString({
            q: this.options.query,
            sort: "hot"
        });
        return "http://reddit.com/search.json?" + qstring;
    },
    getTitle: function() {
        return "Searching: " + this.options.query;
    }
});

var UserListing = RedditListing.extend({
    url: function() {
        var qstring = this.getQueryString();
        return "http://reddit.com/user/" + this.options.username + "/submitted.json?" + qstring;
    },
    getTitle: function() {
        return "User: " + this.options.username;
    }
});


// ---------------------------------------------------- //
// Views 
// ---------------------------------------------------- //

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

        return this;
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

        return this;
    },

    openLink: function($a) {
        this.load($a.attr('href'));

        return this;
    },

    show: function() {
        if (this.$el.children().length > 0) {
            this.$el.addClass('active');
        }

        return this;
    },

    hide: function() {
        this.$el.removeClass('active');

        return this;
    },
    
    clear: function() {
        console.log(this);
        this.$el.empty();
        this.hide();
    }
});


var RedditListingView = Backbone.View.extend({
    tagName: "div",
    className: "listing",

    template: Handlebars.compile($('#listing-template').html()),
    itemTemplate: Handlebars.compile($('#listing-item-template').html()),

    events: {
        "click .listing__item__link": function(e) {
            e.preventDefault();
            this.activateItem($(e.target).closest('li'));
        },
        "click .listing__more": function(e) {
            e.preventDefault();
            this.loadMore();
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
                    this.visited = this.visited.slice(100);
                }
            } else {
                localStorage.visited = [];
            }
        }

        this.collection.on('request', function() { this.setLoading(true); }, this);
        this.collection.on('sync', this.render, this);
        // this.collection.on('all', function(event){ console.log("collection: " + event); }, this);
    },

    render: function() {
        var me = this;

        this.setLoading(false);

        this.$el.html(this.template({
            title: this.collection.getTitle()
        }));

        this.collection.each(function(item) {
            this.$('ul').append(this.itemTemplate(item.attributes.data));
        }, this);

        this.$('li').each(function() {
            if (me.visited.indexOf($(this).data('name')) != -1) {
                $(this).addClass('visited');
            }
        });

        return this;
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

    activateItem: function($li) {
        var me = this;
        
        if ($li.length === 0) { return; }

        $li.siblings().removeClass('active');
        $li.addClass('active');

        // scroll to active
        $('html, body').stop(true).animate({scrollTop : ($li.offset().top - 47 - 36)}, 'slow');

        me.trigger('activate', $li.find('.listing__item__link'));

        this.markVisited($li.data('name'));
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

    loadMore: function(next) {
        var currentActive = this.$('li.active').data('name');
        this.collection.once('sync', function(){
            var $lastActive = this.$("li[data-name=" + currentActive + "]");
            this.activateItem($lastActive);
            if(next) { this.next(); }
        }, this);
        this.collection.more();
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
            this.loadMore(true);
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


// ---------------------------------------------------- //
// Router 
// ---------------------------------------------------- //

var AppRouter = Backbone.Router.extend({
    routes: {
        "": "index",
        "r/:subreddit": "subreddit",
        "s/:q": "search",
        "u/:username": "user"
    },
    
    initialize: function() {
        this.on('route', this.trackView);
        this.on('route', function(){
            this.browser.clear();
        }, this);
    },

    index: function() {
        browser.hide();
        $('#results').html(this.indexContent);
    },

    subreddit: function(subreddit) {
        var query = new SubredditListing({ subreddit: subreddit });
        this.createListing(query);
    },

    search: function(q) {
        var query = new SearchListing({ query: q });
        this.createListing(query);
    },

    user: function(username) {
        var query = new UserListing({ username: username });
        this.createListing(query);
    },

    createListing: function(query, options) {
        browser.hide();

        this.listing = new RedditListingView($.extend(options, { collection: query }));
        this.listing.on('activate', browser.openLink, browser);
        query.fetch();
        $('#results').html(this.listing.el);
    },

    trackView: function() {
        var path = Backbone.history.getFragment();
        if (path === "") {
            document.title = "gaudi";
        } else {
            document.title = path + " | gaudi";
        }
        if (_gaq !== null) {
            _gaq.push(['_trackPageview', path]);
        } else {
            console.log("no gaq found");
        }
    }
});


$(function() {
    app = new AppRouter();
    app.browser = browser = new Browser({el: $('#browser')});

    // save index page
    app.indexContent = $('#results').html();

    Backbone.history.start();
    
    $("#open-btn").on('click', function(e) {
        e.preventDefault();

        var type = $('#listing-type').val();
        var value = $('#listing-value').val();
        app.navigate(type + value, {trigger: true});
    });

    $(document).on('click', 'a.internal', function(e){
        e.preventDefault();
        browser.openLink($(this));
    });

    $(document).on('keydown', function(e){
        switch(e.which) {
            case 40:
                app.listing.next();
                e.preventDefault();
                break;
            
            case 38:
                app.listing.prev();
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
});

