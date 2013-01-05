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

function openSubreddit(subreddit) {
    var url = "http://www.reddit.com/r/" + subreddit + "/hot.json?jsonp=?";
    $.ajax(url, {
        dataType: 'jsonp',
        success: function(data, textStatus, jqXHR){
            if(data.kind == "Listing") {
                var listingHTML = listingTemplate(data.data);
                $('#results').html(listingHTML);
            } else {
                console.log("API didn't return listing")
            }
        },
    });
}

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

function openLink($a) {
        // set active class
        $parentli = $a.closest('li');
        $parentli.siblings().removeClass('active');
        $parentli.addClass('active');

        // scroll to active
        $(window).scrollTop($parentli.offset().top - 47 - 26);

        var $browser = $('#browser');
        var src = $a.attr('href');

        $browser.addClass('active');
        $browser.empty();

        // test for an image
        if (src.substr(-4) == ".jpg") {
            var $image = $('<img />')
            $image.attr('src',src);
            $image.appendTo($browser);

        } else {
            var $iframe = $('<iframe></iframe>')
            $iframe.attr('src',src);
            $iframe.appendTo($browser);
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
    if ($nextli.length > 0)
        openLink($nextli.find('a.internal'));
}

