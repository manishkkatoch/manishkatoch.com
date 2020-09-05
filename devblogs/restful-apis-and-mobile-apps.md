---
title: RESTful APIs and Mobile Apps
excerpt: A practical guide to building resilient and future-safe mobile apps.
image: https://source.unsplash.com/XMFZqrGyV-Q/1600x900
imageCredit: Guilherme Cunha | https://unsplash.com/@guiccunha
imageSource: Unsplash | https://unsplash.com
publications:
    - codeburst.io | https://codeburst.io/restful-apis-and-mobile-apps-a-practical-guide-to-resilient-mobile-apps-5a2d5a0de50e
date: 2019-08-18
layout: layouts/post.njk
tags: ["devblogs", "mobile", "ios", "swift", "featured"]
---

Any mobile application which provide even a moderately complex functionality, offloads this functionality to a backend service. In fact, this is such a common architecture that there is a great set of innovation done to make the applications behave when they are offline!

**First things first, Why APIs?** For formal definition, see this [wiki](https://en.wikipedia.org/wiki/Application_programming_interface). To put, APIs are the abstractions (in our case, served by a remote server) that allow us to consume a functionality without really worrying about the implementations. For mobile developers, it is particularly useful as it allows us to share logic across multiple platforms. be it IOS, Android or Windows.

**Okay, what is RESTful?** REST or REpresentational State Transfer is an architectural style for designing web services ([here](https://oleb.net/2018/rest/) is the extract of the actual [dissertation](https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm) by Roy Fielding). It has been a standard for developing modern APIs but the implementations are generally pragmatic. Heck, there is even a term for this: [Pragmatic REST](https://www.google.com/search?q=pragmatic+rest)!

>If you are uninitiated, this article is a great starting point: https://blog.restcase.com/4-maturity-levels-of-rest-api-design/

The APIs have various consumers: it can be other services, it can be web applications or mobile apps. There are subtle differences with each consumer but there is a key distinction when it comes to mobile apps. Mobile apps don’t enjoy the development and deployment maturity of web-apps or services. The change management is not that easy as there is no easy way to deploy as rapidly as others. Also, there is the issue of _resilience_. A missing/broken link in web-app is not as amplified to a user as a crash of an application on his/her phone.

@[quote](Wouldn’t it be great if our apps never crash?)

Well I would be lying to say it is possible for app to never crash. But app should never crash for a functionality broken at the backend. It should never crash because the APIs were moved or brought down due to issue within them. It should never crash if the APIs were deprecated. This is the resilience we as application developers should aim at.

@[quote](How do you go about developing resilient apps then?)

* **Drive application logic and state from API** — mobile app should not worry about creating or processing data to display.
* **Create open, discoverable APIs** — yes I am talking about HATEOAS. we will talk more about this with example.
* **Make mobile client application dumb**. The mobile app should only worry about how to represent data. It should not contain any functionality specific code.
* **Functionality as capability rather than a logic**.

These points are better understood with a case-study.

---

### AcmeFlix: A case study

AcmeFlix is a poor man’s movie rental application. A user can browse for movies , rate them as well as rent it. The user can rent multiple titles. He/She can put the selected titles in the cart and then can checkout. AcmeFlix wants to ensure they have a website, an iOS as well as an Android application. They are still unsure about the renting rules so as of now any customer can rent a title as long as it is in stock.

#### 1. The API: Open and Discoverable

an open, discoverable API is the one where the client need not know before-hand the way to interact with the endpoint. The API tells it how to. All the client needs is an entry point or what we call as the root URL.

imagine we are hosting such service locally using NodeJS. The entry point will look like below:

```json
//GET https://localhost:3000/
{
    "_links": [
        {
            "rel": "self",
            "href": "http://localhost:3000/"
        },
        {
            "rel": "library",
            "href": "http://localhost:3000/library",
            "type": "vnd.acmeflix.api.library+json"
        }
    ]
}
```

we try to GET the root URL (because you are querying for the first time) and what the API returns is an empty object when it comes to properties. But it embeds `_links` object. The links object tells the client where can it traverse for now. The above can be seen as:

>    _Client: Hey API, what you provide?_
>
>    _API: I got nothing per say, but I can give you links to yourself (ofcourse) and a library_

Now imagine, the user already had few titles in the cart (cart is a server object usually, maybe that user was working on website and then moved to the mobile application. He/She should be able to access that cart). The above URL will return the following response:

```json
//GET https://localhost:3000/
{
    "_links": [
        {
            "rel": "self",
            "href": "http://localhost:3000/"
        },
        {
            "rel": "library",
            "href": "http://localhost:3000/library",
            "type": "vnd.acmeflix.api.library+json"
        },
        {
            "rel": "cart",
            "href": "http://localhost:3000/cart/AzCa3T",
            "type": "vnd.acmeflix.api.cart+json"
        }
    ]
}
```
It now tells the client that there is cart available too. the _type_ represents the type of data this url will return and is more of a documentation pointer (yes, these APIs can be documented as part of discovery tools) than for consumption.

The client now choses to go to the library, Since there is no verb defined in the response, we GET this too (client is always in query mode, unless specifically required)

```json
//GET http://localhost:3000/library
{
    "count": 12,
    "movies": [
        {
            "name": "The Shining",
            "year": 1980,
            "director": "Stanley Kuberick",
            "id": "1msRby",
            "_links": [
                {
                    "rel": "self",
                    "href": "http://localhost:3000/movies/1msRby",
                    "type": "vnd.acmeflix.api.movies+json"
                },
                {
                    "rel": "poster",
                    "href": "http://localhost:3000/poster/1msRby",
                    "type": "image/jpeg"
                }
            ]
        },...
    ],
    "_links": [
        {
            "rel": "self",
            "href": "http://localhost:3000/library",
            "type": "vnd.acmeflix.api.library+json"
        }
    ]
}
```

>_Client: What you got for Library?_
>
>_API: I got 12 movies. Let me give you a metadata for each of them. BTW, they have poster and link to the details too. Enjoy!_

You see where this is going? Each query tells the client what next is available. In other words, the client _**discovers**_ the next steps to be taken and how to take them. Probably with above information the client can build a nice wall of posters and invoke movie details on click of the poster wall? When a particular movie poster is clicked, client can access the details link.

```json
//GET http://localhost:3000/movies/1msRby
{
    "id": "1msRby",
    "name": "The Shining",
    "year": 1980,
    "director": "Stanley Kuberick",
    "rating": 8.4,
    "ratingEnabled": false,
    "synopsis": "A family heads to an isolated hotel for the winter where an evil and spiritual presence influences the father into violence, while his psychic son sees horrific forebodings from the past and of the future.",
    "stock": 10,
    "_links": [
        {
            "rel": "self",
            "href": "http://localhost:3000/movies/1msRby",
            "type": "vnd.acmeflix.api.movie+json"
        },
        {
            "rel": "rent",
            "href": "http://localhost:3000/cart/AzCa3T",
            "type": "vnd.acmeflix.api.cart+json",
            "method": "PUT",
            "parameters": {
                "movieId": "1msRby"
            }
        },
        {
            "rel": "poster",
            "href": "http://localhost:3000/poster/1msRby",
            "type": "image/jpg"
        }
    ]
}

```
>_Client: Good sir, show me the Shining movie details_
>
>_API: Yep, here are the details, you can rent too you know!_

The API returns much more details for a particular movie. Also, the API deems that this movie is “rent-able”. There are 10 units of this title in stock, so the API allows one to rent as the rule succeeds. You can also see there is no URL for the client to rate this movie as the service deemed it is not available due to `ratingEnabled=false` flag.

>note: I have kept `ratingEnabled` and `stock` in response for indication. Acmeflix wouldn’t keep these unrepresentable data as part of response.

Now if the client wants to actually put this item in cart, all it has to do is call the URL, with right verb PUT, and the payload. One cool thing, if the payload is deterministic the client need not even worry about it!

Let’s consider a movie which is out of stock

```json
//GET http://localhost:3000/movies/pLDhp
{
    "id": "pLDhp",
    "name": "Fight Club",
    "year": 1999,
    "director": "David Fincher",
    "rating": 8.8,
    "ratingEnabled": true,
    "synopsis": "An insomniac office worker, looking for a way to change his life, crosses paths with a devil-may-care soap maker, forming an underground fight club that evolves into something much, much more.",
    "stock": 0,
    "_links": [
        {
            "rel": "self",
            "href": "http://localhost:3000/movies/pLDhp"
        },
        {
            "rel": "self",
            "href": "http://localhost:3000/movies/pLDhp",
            "type": "vnd.acmeflix.api.movie+json"
        },
        {
            "rel": "rate",
            "href": "http://localhost:3000/movies/pLDhp",
            "type": "vnd.acmeflix.api.movie+json",
            "method": "PUT",
            "parameters": {
                "rating": "{rating}"
            }
        },
        {
            "rel": "poster",
            "href": "http://localhost:3000/poster/pLDhp",
            "type": "image/jpg"
        }
    ]
}
```

Now since for this movie has no stock left, the API doesn’t return the capability of renting the title. but since ratingEnabled=true it provides capability to rate the movie. Here the payload for rating depends on the selection at client end and hence a template is provided.

Similarly a cart API would like

```json
//GET http://localhost:3000/cart/AzCa3T
{
    "count": 1,
    "items": [
        {
            "name": "The Shining",
            "year": 1980,
            "director": "Stanley Kuberick",
            "id": "1msRby",
            "_links": [
                {
                    "rel": "self",
                    "href": "http://localhost:3000/movies/1msRby",
                    "type": "vnd.acmeflix.api.movies+json"
                },
                {
                    "rel": "poster",
                    "href": "http://localhost:3000/poster/1msRby",
                    "type": "image/jpeg"
                },
                {
                    "rel": "delete",
                    "href": "http://localhost:3000/cart/AzCa3T",
                    "method": "DELETE",
                    "type": "vnd.acmeflix.api.cart+json",
                    "parameters": {
                        "movieId": "1msRby"
                    }
                }
            ]
        }
    ],
    "_links": [
        {
            "rel": "self",
            "href": "http://localhost:3000/cart/AzCa3T"
        },
        {
            "rel": "add",
            "href": "http://localhost:3000/cart/AzCa3T",
            "type": "vnd.acmeflix.api.cart+json",
            "method": "PUT",
            "parameters": {
                "movieId": "{movieId}"
            }
        }
    ]
}
```

##### What have we achieved by this API definition?

We have exposed our **functionality as capability**. the root API has capability of library and cart. A library has capability of providing details and poster of each movie. A movie provides capability to rate or rent ( add to cart). A cart provides capability of either adding more movie or deleting the ones added.

We have achieved **extensibility**. Tomorrow same URL of cart can provide a clear-all functionality usable by clients who can understand it. The clients who are unaware of it, will simply not understand that part.

We have **truly uncoupled client and server**. The Client need not understand the functionality, how it is hosted, how it is served. All it needs to understand is the grammar of the API.

We have achieved to push the **entire application state to the service layer**. The only way to access or modify the state is via the HTTP verbs GET, PUT, DELETE. It is the HTTP Verbs (there is no Hypermedia for Mobile in this context) As The Engine Of Application State. **HATEOAS**.

And we have **documented** our API.

---

#### 2. The Client: AcmeFlix mobile application

To use our API, there are just three pre-requisites for the mobile application: an Http Client that can understand our grammar, knowledge of the capabilities exposed, and the URL where our API is hosted!

_**note**: I am building an IOS app here but it is same for any other platform._

##### Notion of Resource<T>

The Resource is basic entity on the client side. Think of it as the interface of the application with the server. It is also the abstraction that understands the grammar of the API. For example, when we access root URL what we get at the application layer is a `Resource<Root>` which provides access to the underlying Root object and the links (or relations or capabilities) that the API returns for this resource by understanding `_links` structure in the API.

It also provides some basic functionality for the application to work with:

**hasRelation**: checks if the link is available given the name of capability

**getRelation**: gets the link for a given name of the capability.

**capabilityMap**: a high order function which applies the provided functions in case the link is available or unavailable.

```swift
typealias LinkAvailableHandler = (Link) -> Void
typealias LinkUnAvailableHandler = () -> Void

protocol RestResource: Decodable {
    associatedtype modelType where modelType : Decodable
    var item: modelType? {get}
    var links: Array<Link> { get }
}

extension RestResource {
    
    func hasCapability(for linkName: String) -> Bool {
        return links.contains { $0.rel == linkName }
    }
    
    func getRelation(forRel linkItem: String) -> Link? {
        return links.filter { $0.rel == linkItem }.first
    }
    
    func capabilityMap(forRel: String,_ onAvailable: LinkAvailableHandler? = nil,_ onUnavailable: LinkUnAvailableHandler? = nil) {
        if let link = self.getRelation(forRel: forRel) {
            onAvailable?(link)
        } else {
            onUnavailable?()
        }
    }
}

struct Resource<T>: RestResource  where T : Decodable {
    typealias modelType = T
    
    let item : T?
    var links: Array<Link> = Array<Link>()
    
    enum CodingKeys: String, CodingKey {
        case links = "_links"
    }
    
    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        links = try values.decode([Link].self, forKey: .links)
        item = try T.init(from: decoder)
    }
}
```

##### Link

This is a structure which represents the capability. It provides the URL, the method (defaulted to GET) and body JSON if available in case of PUT, DELETE based capabilities.

```swift
struct Link : Decodable, Equatable {
    
    let url: String
    let rel: String
    let method: HttpMethod
    let bodyJson: [String: DecodableValueType]?
    
    enum CodingKeys: String,CodingKey {
        case url = "href"
        case rel, method
        case bodyJson = "parameters"
    }
    
    init(from decoder:Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.url = try container.decode(String.self, forKey: .url)
        self.rel = try container.decode(String.self, forKey: .rel)
        self.bodyJson = try? container.decode([String:DecodableValueType].self, forKey: .bodyJson)
        
        if let methodUnwrapped = try container.decodeIfPresent(String.self, forKey: .method) {
            self.method = HttpMethod(rawValue: methodUnwrapped) ?? HttpMethod.GET
        } else {
            self.method = HttpMethod.GET
        }
    }
    
    init(withUrl url: String) {
        self.url = url
        self.method = HttpMethod.GET
        self.rel = "self"
        self.bodyJson = nil
    }
    
    static func == (lhs: Link, rhs: Link) -> Bool {
        return lhs.url == rhs.url && lhs.rel == rhs.rel && lhs.method == rhs.method
    }
}	
```

##### A Client that can work with Resource

Now that we have `Resource` and `Link` available to us, writing a `RestfulClient` is trivial. The `RestfulClient` need not understand what kind of request is being made; all it needs is a `Link` object and a handler which expects a type of `Resource` to work with!

```swift
//
//  HttpClient.swift
//  Acmeflix
//
//  Created by Manish Katoch on 04/08/19.
//  Copyright © 2019 Manish Katoch. All rights reserved.
//
import Foundation

typealias onResourceDownloadSuccess<T> = (Resource<T>?) -> Void where T : Decodable
typealias onResourceDownloadFailure = (HttpResponseCode) -> Void


typealias HttpRequestBody = [String: DecodableValueType]

// MARK: - Basic set of response codes required for example. Not exhaustive -
enum HttpResponseCode : Int {
    case OK = 200,
    CREATED = 201,
    UPDATE_SUCCESSFUL = 204,
    UNKNOWN_ERROR = 500,
    NOT_FOUND = 404,
    EMPTY_RESOURCE = 1000
    
    func isFailure() -> Bool {
        return [404,500].contains(self.rawValue)
    }
}

// MARK: - Basic set of Verbs required for the example. Not exhaustive -
enum HttpMethod : String, Decodable {
    case GET, PUT, POST, DELETE
}


// MARK: - RESTful Client -
final class RestfulClient: RestfulNetworking {
    private var requestCounter: Int = 0
    private let session: URLSession
    
    static let shared = RestfulClient()
    
    private init(session: URLSession) {
        self.session = session
    }
    
    private convenience init(configuration: URLSessionConfiguration = URLSessionConfiguration.default) {
        self.init(session: URLSession(configuration: configuration))
    }
    
    func request<T>(_ link: Link, withBody body: [String: Any]? = nil, _ onSuccess: @escaping onResourceDownloadSuccess<T>, _ onFailure: @escaping onResourceDownloadFailure) where T : Decodable {
        let decodableBody = body?.mapValues {DecodableValueType.from($0)}
        
        self.request(link.url, link.method, body: decodableBody ?? link.bodyJson) { (data, status) in
            if status.isFailure() {
                DispatchQueue.main.async {
                    onFailure(status)
                }
            } else {
                DispatchQueue.main.async {
                    onSuccess(parse(type: Resource<T>.self, data: data))
                }
            }
        }
    }
    
    func requestRaw(_ link: Link, withBody body: [String: Any]? = nil,
                    onCompletion: ((Data, HttpResponseCode) -> Void)? = nil) {
        let decodableBody = body?.mapValues {DecodableValueType.from($0)}
        
        request(link.url, link.method, body: decodableBody ?? link.bodyJson) { (data, status) in
            onCompletion?(data, status)
    }
    }
    
    private func request(_ url: String, _ method: HttpMethod = HttpMethod.GET,  body: HttpRequestBody? = nil,
                         completion: @escaping (Data, HttpResponseCode) -> Void)
    {
        requestCounter += 1
        let reqNumber = requestCounter
        logRequest(reqNumber, method, url, "BODY:", body as Any)
        if let url = URL(string: url) {
            let request = makeUrlRequest(url: url, method: method, body: body)
            let dataTask = self.session.dataTask(with: request) { data, response, error in
                if let errorReturned = error as NSError? {
                        var errorCode: HttpResponseCode = .UNKNOWN_ERROR
                        if errorReturned.code == NSURLErrorCannotConnectToHost{
                            errorCode = .NOT_FOUND
                        }
                        completion(Data(), errorCode)
                        self.logResponse(reqNumber, HTTPURLResponse.init(), error: errorReturned)
                    }
                if let responseUnwrapped = response as? HTTPURLResponse , let dataUnwrapped = data {
                        let status = HttpResponseCode(rawValue: responseUnwrapped.statusCode) ?? HttpResponseCode.UNKNOWN_ERROR
                        self.logResponse(reqNumber, responseUnwrapped, data: dataUnwrapped)
                        DispatchQueue.main.async {
                            completion(dataUnwrapped , status)
                        }
                }
            }
            dataTask.resume()
        }
    }
    
    // MARK: - Poor man's logger -
    private func log(_ msgs: [Any]) {
        let prefix = "[HTTPClient]"
        let msgString = msgs.map { (msgPart) -> String in
            switch msgPart {
            case is String: return msgPart as! String
            default: return String(describing: msgPart)
            }
            }.joined(separator: " ")
        print("\(prefix)\(msgString)")
    }
    private func logRequest(_ reqNumber: Int, _ msg: Any...) {
        log(["[REQUEST #\(reqNumber)]:"] + msg)
    }
    private func logResponse(_ reqNumber: Int, _ response: HTTPURLResponse, data: Data? = nil, error: NSError? = nil) {
        let contentType = response.allHeaderFields["Content-Type"] as? String ?? "UNDEF"
        let dataString = contentType.contains("json") ? String(data: data ?? Data(), encoding: .ascii) : "[IMAGE]"
    
        log(["[RESPONSE #\(reqNumber)]:","Content-Type=\(contentType)", dataString as Any])
    }
}
```

##### The application code

consider model Root, our entry point to the application:

```swift
class Root: Decodable {}

extension Resource where T:Root {
    func hasLibrary() -> Bool {
        return self.hasCapability(for: "library")
    }
    func getLibraryLink() -> Link? {
        return self.getRelation(forRel: "library")
    }
    func getCartLink() -> Link? {
        return self.getRelation(forRel: "cart")
    }
    
    func library(onAvailable: LinkAvailableHandler? = nil, onUnavailable: LinkUnAvailableHandler? = nil){
        capabilityMap(forRel: "library", onAvailable, onUnavailable)
    }
    
    func cart(onAvailable: LinkAvailableHandler? = nil, onUnavailable: LinkUnAvailableHandler? = nil){
        capabilityMap(forRel: "cart", onAvailable, onUnavailable)
    }
}
```
Since `Root` is about basic capabilities and not objects its an empty class. The crux lies in extending generic Resource for `Root` and adding more domain specific capabilities.

The `Resource<Root>` exposes two higher order functions: library and cart which execute specific closure given the capability is available or not.

Now we can have the main `ViewController` utilise our setup as below:

```swift
import UIKit
import SwiftyJSON

class ViewController: UIViewController {
  
    private let reuseIdentifier = "MovieCell"
    private let httpClient = RestfulClient.shared
    
    private var movies: [Resource<Movie>] = []
    private var selectedMovie: Resource<Movie>?
    private var root: Resource<Root>?
    
    @IBOutlet weak var libraryCollectionView: UICollectionView! {
        didSet {
            self.libraryCollectionView.dataSource = self
            self.libraryCollectionView.delegate = self
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        self.title = "ACMEFLIX" 
        
        //entry point
        let rootLink = Link(withUrl: "http://localhost:3000/")
        loadResource(rootLink, onSuccess: rootIsLoaded )
    }
    
    private func loadResource<T>(_ link: Link, onSuccess: @escaping onResourceDownloadSuccess<T>){
        httpClient.request(link, onSuccess, onResourceLoadFailure)
    }
    
    private func rootIsLoaded(_ resource: Resource<Root>?) {
        root = resource
        root?.library(onAvailable: { (link) in
            self.loadResource(link, onSuccess: self.libraryIsLoaded)
        }, onUnavailable: {
            self.onResourceLoadFailure(.EMPTY_RESOURCE)
        })
        
        root?.cart(onAvailable: { (link) in
            self.navigationItem.rightBarButtonItem =  UIBarButtonItem.init(title: "CART", style: .done, target: self, action: #selector(self.cartTapped(_:)))
        }, onUnavailable: {
            self.navigationItem.rightBarButtonItem = nil
        })
    }
    
    @objc private func cartTapped(_ sender: Any) {
        performSegue(withIdentifier: "showCart", sender: self)
    }
    
    private func libraryIsLoaded(_ resource: Resource<Library>?) {
        
        self.movies = resource?.getMovies() ?? []
        
        let syncDispatch = DispatchGroup()
        
        movies.forEach({ (movie) in
            if let poster = movie.getPosterLink(), let movieItem = movie.item {
                syncDispatch.enter()
                httpClient.requestRaw(poster) {(data, status) in
                    PosterCache.shared.addToCache(forKey: movieItem.id, poster: Poster(fromData: data))
                    syncDispatch.leave()
                }
            }
        })
        syncDispatch.notify(queue: .main) {
            self.libraryCollectionView.reloadData()
        }
        
    }

    private func onResourceLoadFailure(_ status: HttpResponseCode) {
        self.performSegue(withIdentifier: "onFailLoad", sender: self)
    }
    
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        if segue.identifier == "onMovieSelect" {
            if let vc = segue.destination as? MovieViewController, let movie = selectedMovie {
                vc.movie = movie
            }
        }
        else if segue.identifier == "showCart" {
            if let vc = segue.destination as? CartViewController, let cartLink = root?.getCartLink() {
                vc.cartLink = cartLink
            }
        }
    }
}
```
we start off with loading the root resource

```swift
let rootLink = Link(withUrl: "http://localhost:3000/")
loadResource(rootLink, onSuccess: rootIsLoaded )
```

Once the root is loaded, we check if we have capabilities and we take decisions appropriately. Again, all the decisions taken are from UI point of view. No functional logic. A pseudocode of above would be

```swift
loadResource(rootLink, onSuccess: rootIsLoaded )rootIsLoaded {
  root.library( onAvailable: populate movies, onUnavailable: show try again view)
  
  root.cart( onAvailable: show on actionbar, onUnavailable: ensure it is not visible)
}
```

The above code works in following permutations:

![Left to Right: 1. Library and Cart available , 2. Library unavailable, 3. cart unavailable](/images/restful-apis-and-mobile-apps/first.png)

Even when displaying posters, it is matter of poster being available for the movie or not to decide when the app should show default image.

Let’s take a look at movie controller which provides the capabilities to rent or rate a movie.

```swift
//
//  MovieViewController.swift
//  Acmeflix
//
//  Created by Manish Katoch on 08/08/19.
//  Copyright © 2019 Manish Katoch. All rights reserved.
//
import Foundation
import UIKit

class MovieViewController: AcmeflixViewController {
    
    @IBOutlet weak var contentView: UIVisualEffectView!
    @IBOutlet weak var posterImageView: UIImageView!
    @IBOutlet weak var directorLabel: InfoLabel!
    @IBOutlet weak var yearLabel: InfoLabel!
    @IBOutlet weak var rentNowButton: AcmeButton!
    @IBOutlet weak var ratingControl: StarControlView!
    @IBOutlet weak var synopsisLabel: UILabel!
    
    private let httpClient = RestfulClient.shared
    private var cart: Resource<Cart>?
    var movie: Resource<Movie>?
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        if let movieResource = movie, let movieUnwrapped = movieResource.item {
            print(movieResource)
            title = movieUnwrapped.name.uppercased()
            posterImageView.image = PosterCache.shared.get(forKey: movieUnwrapped.id).image
            synopsisLabel.text = movieUnwrapped.synopsis
            directorLabel.text = movieUnwrapped.director
            yearLabel.text = String(movieUnwrapped.year)
            ratingControl.rating = movieUnwrapped.rating ?? 0
            
            movieResource.rent(onUnavailable: {
                self.rentNowButton.disabled = true
            })
            
            movieResource.rating(onAvailable: { (ratingLink) in
                self.ratingControl.didFinishTouchingCosmos = { value in
                    self.httpClient.request(ratingLink, withBody: ["rating": value], { (resource:Resource<Root>?) in
                            self.alert("Hurray!", message: "your ratings are with us now!")
                        }, { (statusCode) in
                            self.alert("Oops!", message: "unable to record your rating at this moment. Please try again later.")
                        })
                    
                    
                }
            }, onUnavailable: {
                self.ratingControl.didFinishTouchingCosmos = { value in
                    self.alert("Sorry!", message: "This title cannot be rated anymore.")
                    self.ratingControl.rating = movieUnwrapped.rating ?? 0
                }
            })
        } else {
            performSegue(withIdentifier: "onFailLoad", sender: nil)
        }
    }
    @IBAction func rentNowButtonClicked(_ sender: Any) {
        if rentNowButton.disabled {
            alert("Sorry!", message: "This title is unavailable for rent at this moment.")
        } else {
            if let movieUnwrapped = movie,
                let rentLink = movieUnwrapped.getAddToCartLink() {
                httpClient.request(rentLink, { (cart:Resource<Cart>?) in
                    self.cart = cart
                    self.performSegue(withIdentifier: "showCart", sender: nil)
                }) { (statusCode) in
                    self.alert("Oops!", message: "something went wrong adding this title to your cart. try again later")
                }
            }
        }
    }
    
    func showCart() {
        self.performSegue(withIdentifier: "showCart", sender: nil)
    }
    
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        if segue.identifier == "showCart" {
            if let vc = segue.destination as? CartViewController {
                vc.cart = cart
            }
        }
    }
}

class AcmeflixViewController: UIViewController {
    
    func alert(_ title: String, message: String) {
        let alertView = UIAlertController.init(title: title, message: message, preferredStyle: .alert)
        alertView.view.backgroundColor = .darkGray
        DispatchQueue.main.async {
            alertView.show(self, sender: nil)
            alertView.addAction(UIAlertAction(title: "OK", style: .cancel, handler: nil))
            self.present(alertView, animated: true, completion: nil)
        }
    }
}
```
```swift
movieResource.rent(onUnavailable: {
    self.rentNowButton.disabled = true
})
```

If the resource does not have rent capability: disable the rent now button. Now the Rent Now button can have a behavior like below:

```swift
func rentNowButtonClicked(_ sender: Any) {
    if rentNowButton.disabled {
    alert("Sorry!", message: "This title is unavailable for rent at this moment.")
} else {
    if let movieUnwrapped = movie,
       let rentLink = movieUnwrapped.getAddToCartLink() {
    
    httpClient.request(rentLink, { (cart:Resource<Cart>?) in           self.performSegue(withIdentifier: "showCart", sender: nil)
    self.cart = cart
}) { (statusCode) in
    self.alert("Oops!", message: "something went wrong adding this title to your cart. try again later")
       }
     }
   }
}
```

If button is disabled, show a sorry alert message. If it is enabled, then you can get the Add to Cart link and send the request to Client. It expects API to either return a new Resource of Cart which can be show back to user or another error alert message.

![Left to Right: gray-ed out rent button, alert on click of gray-ed button, active rent button, cart on successful call to action of rent button](/images/restful-apis-and-mobile-apps/second.png)

Similarly if rating is enabled you activate interaction with the rating control (Cosmos in this case) as below:

```swift
movieResource.rating(onAvailable: { (ratingLink) in
    self.ratingControl.didFinishTouchingCosmos = { value in
        self.httpClient.request(ratingLink,
            withBody: ["rating": value], { (resource:Resource<Root>?) in
                self.alert("Hurray!", message: "your ratings are with us now!")
            }, { (statusCode) in
                self.alert("Oops!", message: "unable to record your rating at this moment. Please try again later.")
            }
        )
    }
}, onUnavailable: {
    self.ratingControl.didFinishTouchingCosmos = { value in 
        self.alert("Sorry!", message: "This title cannot be rated anymore.")
        self.ratingControl.rating = movieUnwrapped.rating ?? 0
        }
    }
)
```

Below are the snapshots of such functionality:

![Left to Right: un-rateable movie, rating registered for a movie, the cart, delete movie from cart.](/images/restful-apis-and-mobile-apps/third.png)

##### Closing Notes

We developed an MVP for AcmeFlix, for IOS, without writing a single code of functionality by leveraging open, discoverable APIs ( or HATEOAS architecture) . At this point, lets address futurespective requirements that AcmeFlix may need to address sooner than later:

* Extensibility & Backward Compatibility

If AcmeFlix adds a new capability, all the older clients will ignore it as they have no knowledge. If there are bug fixes to existing capability, since there is no local state of the application, the development safety nets should suffice to catch any anomalies.

* API Management

need to relocate API or release new version? as long as the root is known to client, you may even refactor a monolith service to a micro-service setup without a single change at client.

To be honest, there is lot of reluctance to accept HATEOAS because of few very valid reasons. There is no standardisation of grammars of API (JSON-HAL is a work-in-progress in this regard). You are essentially writing a browser of APIs which understands what the API is going to provide. This is a serious issue in the world of web where you don’t know what the clients will be, and hence the clients won’t use your APIs either.

But all these cons apply to a setup where you are just an API provider _with public visibility_. It is perfectly good solution for a private platform setup. The API team understands the domain, can build capabilities (even hierarchies of it!). The mobile application client knows the API and can leverage it fully.

Thats all! Thank you for staying with me till this point. I hope this is useful for you to in creating great experiences on mobile.

The source codes are available here:

AcmeFlix service: https://github.com/manishkkatoch/acmeflix-njs-service

AcmeFlix iOS App : https://github.com/manishkkatoch/acmeflix-ios

Here’s a full fledged demo gif:

<div style='position:relative; padding-bottom:calc(70% + 20px)'><iframe src='https://gfycat.com/ifr/ClearDeadlyAustraliansilkyterrier' frameborder='0' scrolling='no' width='100%' height='100%' style='position:absolute;top:0;left:0;' allowfullscreen></iframe></div><p> <a href="https://gfycat.com/cleardeadlyaustraliansilkyterrier">via Gfycat</a></p>