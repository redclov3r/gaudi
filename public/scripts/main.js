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
    var difference = (now.getTime() - milliseconds)

    var differenceMinutes = difference / (60 * 1000);

    if (differenceMinutes > (60 * 24)) {
        return Math.round(differenceMinutes / (60 * 24)) + " days ago";
    }

    if (differenceMinutes > 60) {
        return Math.round(differenceMinutes / 60) + " hours ago";
    }

    return Math.round(differenceMinutes)  + " minutes ago";
});

var listingTemplate = Handlebars.compile($('#listing-template').html());

var spinnerOpts = {
    lines: 17,
    length: 4,
    radius: 17,
    corners: 1,
    trail: 100,
    color: "#8D8674"
};

function openSubreddit(subreddit, after, append, callback) {
    setLoading(false);

    var url = "http://www.reddit.com/r/" + subreddit + "/hot.json";
    var data = {};

    if (after != undefined) {
        data.after = after;
    };

    if (append == undefined) {
        append = false;
    };
    
    setLoading(true);

    $.ajax(url, {
        dataType: 'jsonp',
        jsonp: 'jsonp',
        data: data,
        success: function(data, textStatus, jqXHR){
            setLoading(false)
            if(data.kind == "Listing") {

                var listingHTML = listingTemplate(data.data);
                var $ul = $('#results').find('ul');

                if ($ul.length == 0 || $ul.data("subreddit") != subreddit || !append) {
                    $ul = $('<ul class="listing">');
                }

                $ul.append(listingHTML).appendTo($('#results').empty());
                $ul.data("subreddit", subreddit);

                if (callback != undefined) {
                    callback();
                };
            } else {
                console.log("API didn't return listing")
            }
        },
    });
}

function openLink($a) {
        // set active class
        $parentli = $a.closest('li');
        $parentli.siblings().removeClass('active');
        $parentli.addClass('active');

        // scroll to active
        // $(window).scrollTop($parentli.offset().top - 47 - 24);
        $('html, body').animate({scrollTop : ($parentli.offset().top - 47 - 36)}, 'slow')

        browser.load($a.attr('href'));
}

function loadMore($ul, callback) {
    var subreddit = $ul.data("subreddit");
    var lastItem = $ul.children('li').last().data("name");
    openSubreddit(subreddit, lastItem, true, callback);
}

// TODO: remove global var!
var spinner;

function setLoading(isLoading) {
    if(isLoading) {
        $('#spinner').show().addClass('active');
        spinner = new Spinner(spinnerOpts).spin(document.getElementById('spinner'));
    } else {
        if(spinner != undefined && spinner.stop != undefined)
            spinner.stop();
        $('#spinner').hide().removeClass('active');
    }
}

function prev() {
    var $activeli = $('#results li.active');
    if($activeli.length == 0) {
        var $nextli = $('#results li').last();
    } else {
        var $nextli = $activeli.prev();
    }
    if ($nextli.length > 0)
        openLink($nextli.find('a.internal'));
}

function next() {
    var $activeli = $('#results li.active');
    if($activeli.length == 0) {
        var $nextli = $('#results li').first();
    } else {
        var $nextli = $activeli.next();
    }
    if ($nextli.length > 0) {
        openLink($nextli.find('a.internal'));
    } else {
        loadMore($activeli.parent(), next);
    }
}

var Browser = function(elementSelector) {
    this.$el = $(elementSelector);
    this.timeout = 7000;
    this.timeoutId = null;
}

Browser.prototype.load = function(url) {
    var me = this;

    clearTimeout(me.timeoutId);
    me.$el.empty().addClass('active');

    // test for an image
    // TODO: redo extension checking in a clean way
    var imageExtensions = {
        ".jpg":1,
        "jpeg":1,
        ".png":1
    }

    if (url.substr(-4) in imageExtensions) {
        var $image = $('<img />');
        $image.attr('src',url);
        $image.appendTo(me.$el);
    } else {
        var $iframe = $('<iframe></iframe>');

        // Error handling
        $iframe.data('loaded', false);
        $iframe.on('load', function() {
            $iframe.data('loaded', true);
        });
        me.timeoutId = setTimeout(function() {
            if(!$iframe.data('loaded')) {
                $iframe.remove();
                var errorTemplate = Handlebars.compile($('#error-template').html());

                me.$el.append(errorTemplate({"url": url}));
            }
        }, me.timeout);
        
        $iframe.attr('src',url);
        $iframe.appendTo(me.$el);
    }
}

var browser = new Browser('#browser');

$(function() {
    $('#open-btn').on('click', function(e) {
        var sr = $('#subreddit').val();
        if (sr == "") {sr = "pics"};
        openSubreddit(sr);
        $('#browser').removeClass('active');
        e.preventDefault();
    })

    $(document).on('mouseenter', '#browser', function(e){
        if ($('#browser').children().length > 0)
            $('#browser').addClass('active');
    });

    $(document).on('mouseleave', '#browser', function(e){
        $('#browser').removeClass('active');
    });

    $(document).on('click', 'a.internal', function(e){
        openLink($(this));
        e.preventDefault();
    });

    $(document).on('keydown', function(e){
        switch(e.which) {
            case 40:
                next();
                e.preventDefault();
                break;
            
            case 38:
                prev();
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
});

