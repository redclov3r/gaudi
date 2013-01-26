class RedditQuery
    queryEndpoint: (endpoint, data, callback) ->
        # loads the given endpoint and calls the callback function with the return value
        $.ajax(endpoint, {
            dataType: 'jsonp',
            jsonp: 'jsonp',
            data: data,
            success: (data, textStatus, jqXHR) ->
                if data.kind == "Listing"
                    if callback?
                        callback(data)
                    else
                        console.log(data)

                else
                    console.log("API didn't return listing")
        })


class RedditSubreddit extends RedditQuery
    constructor: (@subreddit) ->

    load: (callback, after) ->
        endpoint = "http://www.reddit.com/r/" + @subreddit + "/hot.json"
        data = {}
        if after?
            data.after = after

        this.queryEndpoint(endpoint, data, callback)

class RedditSearch extends RedditQuery
    constructor: (@query) ->

    load: (callback, after) ->
        endpoint = "http://www.reddit.com/search.json"
        data = {
            q: @query,
            sort: "hot"
        }
        if after?
            data.after = after

        this.queryEndpoint(endpoint, data, callback)


# export my classes
window.RedditQuery = RedditQuery
window.RedditSubreddit = RedditSubreddit
window.RedditSearch = RedditSearch
