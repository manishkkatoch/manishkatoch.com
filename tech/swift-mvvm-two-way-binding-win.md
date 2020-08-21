---
title: Swift + MVVM + Two Way Binding = Win!
titleImage:
    url: https://source.unsplash.com/ImcUkZ72oUs/1600x900
    credits: israel palacio | https://unsplash.com/@othentikisra
    source: Unsplash | https://unsplash.com
description: A way to achieve two way bindings on a UIControl and Observable, so that you write the code, you want to write, not the code you have to write
publications:
    - codeburst.io | https://codeburst.io/swift-mvvm-two-way-binding-win-b447edc55ff5
date: 2017-11-26
layout: layouts/post.njk
tags: ["tech", "mobile", "ios", "swift"]
---

MVVM? why not MVC that Apple recommends? Android does MVP great right? How about the cool VIPER pattern? I believe great efforts have already been put to explain what each pattern brings to the table and so the idea here is not to add to the debate but merely build on top of the opinion I have already formed: _MVVM is the way to go_.

As a quick primer to what MVVM is, it is a design pattern whereby the ViewModel mediates between a data providing Model and View which displays the data provided. Kind of like the following diagram:

![model-view-controller](https://upload.wikimedia.org/wikipedia/commons/b/b5/ModelViewControllerDiagram2.svg)

in iOS, View is essentially a ViewController and ViewModel is an object (a structure) which provides exact data for the view to render.

This provides a loosely coupled architecture which is maintainable ( very thin view controllers ) and testable (ViewModel abstracts out the UI and hence is easily testable).

There is still a caveat though: classic MVVM allows for single responsibility principle easily (and beautifully) in case of models as domain models. However, in case of anaemic models ( which is generally the case when you have well written REST APIs), one would also need another _Mediator_ or _Presenter_ which facilitates data and navigation flow.

Now, View Model has responsibility to update View as well as get updates from View regarding the changes made by the user. This can be achieved by minimum code using bi-directional data binding.

But …

I was bit stumped here, with KVO bindings as first class feature from time unknown, I was expecting two way bindings to be available organically too. the alternatives are available though, thankfully, like _SwiftBond_, or full fledged reactive libraries like _RxSwift_, _RxCocoa_.

Since two binding is a very tiny spec in paradigm of Reactive Programming, unless I am working with streams, I believe its a _heavy_ dependency to have in the application and instead, explored what it takes to have two way bindings working cleanly and quickly.

#### The Observable

Two way binding is essentially a Observer-Listener (or Pub/Sub) pattern in a bi-directional setup. The two participants, generally a Control and a DataProvider are bound to each other such that on change of values, the corresponding component’s listener is notified with value changed.

Firstly, we need the Observable to provide the above pattern.Consider following gist:

```swift
//
//  Observable.swift
//  SimpleTwoWayBinding
//
//  Created by Manish Katoch on 11/26/17.
//
import Foundation

public class Observable<ObservedType> {
    public typealias Observer = (_ observable: Observable<ObservedType>, ObservedType) -> Void
    
    private var observers: [Observer]
    
    public var value: ObservedType? {
        didSet {
            if let value = value {
                notifyObservers(value)
            }
        }
    }
    
    public init(_ value: ObservedType? = nil) {
        self.value = value
        observers = []
    }
    
    public func bind(observer: @escaping Observer) {
        self.observers.append(observer)
    }
    
    private func notifyObservers(_ value: ObservedType) {
        self.observers.forEach { [unowned self](observer) in
            observer(self, value)
        }
    }
}
```
A simple generic class Observable which notifies all the “observers” whenever its value is set. note: _The nullability is more to signify unset condition than actual null value to the observed data._

#### Bindable

Now that we have Observable, we can define a protocol which can be conformed by UI Controls (or any object essentially, or you can create your custom controls ) which will allow you to have the bi directional setup.

```swift
//
//  Bindable.swift
//  SimpleTwoWayBinding
//
//  Created by Manish Katoch on 11/26/17.
//
import Foundation
import UIKit

public protocol Bindable: NSObjectProtocol {
    associatedtype BindingType: Equatable
    func observingValue() -> BindingType?
    func updateValue(with value: BindingType)
    func bind(with observable: Observable<BindingType>)
}

fileprivate struct AssociatedKeys {
    static var binder: UInt8 = 0
}

extension Bindable where Self: NSObject {

    private var binder: Observable<BindingType> {
        get {
            guard let value = objc_getAssociatedObject(self, &AssociatedKeys.binder) as? Observable<BindingType> else {
                let newValue = Observable<BindingType>()
                objc_setAssociatedObject(self, &AssociatedKeys.binder, newValue, objc_AssociationPolicy.OBJC_ASSOCIATION_RETAIN_NONATOMIC)
                return newValue
            }
            return value
        }
        set(newValue) {
             objc_setAssociatedObject(self, &AssociatedKeys.binder, newValue, objc_AssociationPolicy.OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }
    
    func getBinderValue() -> BindingType? {
        return binder.value
    }
    
    func setBinderValue(with value: BindingType?) {
        binder.value = value
    }
    
    func register(for observable: Observable<BindingType>) {
        binder = observable
    }
    
    func valueChanged() {
        if binder.value != self.observingValue() {
            setBinderValue(with: self.observingValue())
        }
    }

    public func bind(with observable: Observable<BindingType>) {
        if let _self = self as? UIControl {
            _self.addTarget(Selector, action: Selector{ self.valueChanged() }, for: [.editingChanged, .valueChanged])
        }
        self.binder = observable
        self.observe(for: observable) { (value) in
            self.updateValue(with: value)
        }
        
    }
}
```

In the above gist, you have a Bindable protocol which has default implementation which uses an internal binder Observable object (objc associatedobjects FTW! ) which is set on control state change detected.(shout out to https://github.com/cprovatas for Selector based action approach. very nifty!)

#### UIControls + Bindable

Now that you have Bindable and Observable in place, lets have common control’s extension and get them ready for action:

```swift

//
//  UIControls+Bindable.swift
//  SimpleTwoWayBinding
//
//  Created by Manish Katoch on 11/26/17.
//
import Foundation

extension UITextField : Bindable {
    public typealias BindingType = String
    
    public func observingValue() -> String? {
        return self.text
    }
    
    public func updateValue(with value: String) {
        self.text = value
    }
}

extension UISwitch : Bindable {
    public typealias BindingType = Bool
    
    public func observingValue() -> Bool? {
        return self.isOn
    }
    
    public func updateValue(with value: Bool) {
        self.isOn = value
    }
}

extension UISlider : Bindable {
    public typealias BindingType = Float
    
    public func observingValue() -> Float? {
        return self.value
    }
    
    public func updateValue(with value: Float) {
        self.value = value
    }
}

extension UIStepper : Bindable {
    public typealias BindingType = Double
    
    public func observingValue() -> Double? {
        return self.value
    }
    
    public func updateValue(with value: Double) {
        self.value = value
    }
}

```

Since we have already defined a default implementation: All we need to conform now to is the way each control updates and exposes its values using updateValue and observingValue methods. Pretty Simple!

#### A Sample

Let’s put our mini framework to use. Let’s assume we are making a form. Firstly, we design a ViewModel which encapsulates our needs. All the properties that we need to monitor are wrapped with Observables. Like below (ignore few pretty get functions, they are BAU methods :) )

```swift
//
//  FormViewModel.swift
//  SimpleTwoWayBinding_Example
//
//  Created by Manish Katoch on 11/26/17.
//  Copyright © 2017 CocoaPods. All rights reserved.
//
import Foundation
import SimpleTwoWayBinding

struct FormViewModel {
    let name: Observable<String> = Observable()
    let companyName: Observable<String> = Observable()
    let yearsOfExperience: Observable<Double> = Observable()
    let isCurrentEmployer: Observable<Bool> = Observable(false)
    let approxSalary: Observable<Float> = Observable()
    let comments: Observable<String> = Observable()
    
    func getExperienceString() -> String {
        if let yearsOfExperience = yearsOfExperience.value {
            return "\(String(describing: yearsOfExperience)) yrs"
        }
        return "--"
    }
    
    func getSalaryString() -> String {
        if let approxSalary = approxSalary.value {
            let normalizedValue = approxSalary / 1000.0
            return "\(normalizedValue)k"
            
        }
        return "--"
    }
    
    func getPrettyString() -> String {
        return
            "Name: \(String(describing: name.value ?? "--"))\n" +
            "Company: \(String(describing: companyName.value ?? "--"))\n" +
            "Experience: \(getExperienceString())\n" +
            "Current Employer?: \(((isCurrentEmployer.value ?? false) ? "YES" : "NO"))\n" +
            "approx Salary: \(getSalaryString())\n" +
            "Comments: \(String(describing: comments.value ?? "--"))"
    }
}

```

With View Model in place, we go ahead and create our view controller. Now below is _all the code that you need to have your form working_ :

```swift
//
//  ViewController.swift
//  SimpleTwoWayBinding
//
//  Created by Manish Katoch on 11/26/2017.
//  Copyright (c) 2017 Manish Katoch. All rights reserved.
//
import UIKit
import SimpleTwoWayBinding

class ViewController: UIViewController {

    @IBOutlet weak var nameField: UITextField!
    @IBOutlet weak var companyField: UITextField!
    @IBOutlet weak var isCurrentEmployerSwitch: UISwitch!
    @IBOutlet weak var yearsOfExperienceStepper: UIStepper!
    @IBOutlet weak var salaryRangeSlider: UISlider!
    @IBOutlet weak var selectedSalaryRangeLabel: UILabel!
    @IBOutlet weak var selectedYearsOfExperienceLabel: UILabel!
    
    var viewModel: FormViewModel!
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        self.navigationItem.title = "Survey Form"
        setupBindings()
    }
    
    func setupBindings() {
        nameField.bind(with: viewModel.name)
        companyField.bind(with: viewModel.companyName)
        isCurrentEmployerSwitch.bind(with: viewModel.isCurrentEmployer)
        yearsOfExperienceStepper.bind(with: viewModel.yearsOfExperience)
        salaryRangeSlider.bind(with: viewModel.approxSalary)
      
        selectedSalaryRangeLabel.observe(for: viewModel.approxSalary) {
            [unowned self](_) in
            self.selectedSalaryRangeLabel.text =
                self.viewModel.getSalaryString()
        }
        
        selectedYearsOfExperienceLabel.observe(for: viewModel.yearsOfExperience) {
            [unowned self](_) in
            self.selectedYearsOfExperienceLabel.text =
                self.viewModel.getExperienceString()
        }
    }
}
```

setupBindings , on viewWillAppear binds our control to respective view model properties and now on all the changes are bi directional.

here is the code in action

<div style='position:relative; padding-bottom:calc(70% + 20px)'><iframe src='https://gfycat.com/ifr/MealyThirdItaliangreyhound' frameborder='0' scrolling='no' width='100%' height='100%' style='position:absolute;top:0;left:0;background: white;' allowfullscreen></iframe></div><p> <a href="https://gfycat.com/mealythirditaliangreyhound">via Gfycat</a></p>

That’s it!
The entire project is available at: https://github.com/manishkkatoch/SimpleTwoWayBindingIOS