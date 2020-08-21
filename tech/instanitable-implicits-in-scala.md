---
title: Instantiable Implicits in Scala
titleImage:
    url: https://source.unsplash.com/qjnAnF0jIGk/1200x900
    credits: Markus Spiske | https://unsplash.com/@markusspiske
    source: Unsplash | https://unsplash.com
description: A review of Scala design pattern that allows you to manage context without explicit parameter declarations.
publications:
    - codeburst.io | https://codeburst.io/scala-snippets-1-instanitable-implicits-a37dadc5a8fc
date: 2019-02-18
layout: layouts/post.njk
tags: ["tech", "scala", "patterns"]
---

If you have ever written non-trivial code in Scala, you would have come across methods that take implicit parameters. Implicitly passing parameter is an important aspect of Scala that provides a **contextual abstraction** to your domain. One can design the domain model by the fact that by the time of instantiation and processing the functionality of the implicitly passed parameter will be available, irrespective of how it is created or provided. Implicit parameters are defined by prefixing `implicit` keyword to the parameter of a method. all the parameters defined after the keyword are implicit to the method definition.

When Scala encounters such method on compile time and provided the parameter is not passed explicitly, it tries to find an implicit definition in the lexical scope of the call chain and if it can, passes it automatically.

There are three ways to define an implicit parameter instance:

- a val or var defined with implicit keyword in the lexical scope.
- importing above defined instance from other modules into the scope.
- defining the type in such a way that it can be created if no instance found.

First two being trivial methods, below is a useful pattern to define the type that can provide an implicit instance if none found in scope.

```scala

// The trait that needs to be implicitly passed.
trait StringConverter[T] { 
 def getStringRepresentation(t: T): String
}

// companion object to provide apply and implicit definitions per type.
object StringConverter {

    // apply method to be called by compiler in case no instance found.
    def apply[T](implicit stringConverter: StringConverter[T]): StringConverter[T] = stringConverter

    // sugar method to avoid writing the new construct for each instance. 
    def createConverter[T](f: T => String): StringConverter[T] = new StringConverter[T] { 
        override def getStringRepresentation(t: T): String = f(t)
    }

    // basic implicit instances for primitive types.
    implicit val intConverter: StringConverter[Int] = createConverter(t => s"Int: $t")
    implicit val doubleConverter: StringConverter[Double] = createConverter(t => f"Double: $t%2.2f")
    implicit val longConverter: StringConverter[Long] = createConverter(t => s"Long: $t")
    implicit val booleanConverter: StringConverter[Boolean] = createConverter { 
        case true => "YES"
        case false => "NO" 
    }

    implicit val stringConverter:StringConverter[String] =
        createConverter(t => t.toLowerCase) 

    // A generic converter for type T provided at compile time.
    implicit def productConverter[T]: StringConverter[T] =
        createConverter(instance => instance.toString) 
}

```

The essence of the pattern is to define `apply` method which provides the implicit instance to the caller. Such implicit parameter can be used in two ways: as implicit parameter explained above and as a context bound to type parameter.

>The context bound usage is specially useful if the implicit parameter needs to be used downstream as you can eliminate defining the implicit parameter in all the subsequent methods.

```scala

// defining an implicit converter
def toRepr[T](t: T)(implicit stringConverter: StringConverter[T]): String = 
    stringConverter.getStringRepresentation(t)

// defining context bound implicit, ideal when the implicit needs to be passed down the call chain. 
// works identical to implicit parameter and is an aesthetic choice.
def contextBoundToRepr[T: StringConverter](t: T): String = 
    implicitly[StringConverter[T]].getStringRepresentation(t)

```

and can be used as below:

```scala

import StringConverter._toRepr(12000)
//res0: String = Int: 12000

toRepr[Double](120.1234)
//res1: String = Double: 120.12

toRepr(false)
//res2: String = NO

contextBoundToRepr("SomeThingSmallCased")
//res3: String = somethingsmallcased

contextBoundToRepr(Set(1,2,3,4))
//res4: String = Set(1, 2, 3, 4)

```

Every time Scala doesn’t find an implicit value, it will create a new instance at compile time. **this can considerably increase the compile time** as well as the compiled library size for a fairly large project with traits, working on large number domain models, provided implicitly. Consider below code where we haven’t provided any default `StringConverter` and we have two separate scope which expects a `StringConverter[T]`

```scala
object StringConverter { 
    // apply method to be called by compiler in case no instance found. 
    def apply[T](implicit stringConverter: StringConverter[T]): StringConverter[T] = stringConverter
    
    // sugar method to avoid writing the new construct for each instance.
    def createConverter[T](f: T => String): StringConverter[T] = new StringConverter[T] { 
        override def getStringRepresentation(t: T): String = f(t)
    }

    implicit def productConverter[T]: StringConverter[T] =
        createConverter(instance => instance.toString) 
}

// caller method
def implicitTestMethod[T](t: T)(implicit stringConverter: StringConverter[T]): String = { 
    println(s"instance: ${stringConverter.hashCode()}") 
    stringConverter.getStringRepresentation(t)
}

// methods to simulate different scopes 
def enclosingScopeA():String = implicitTestMethod("SomeThing")
def enclosingScopeB(): String = implicitTestMethod("SomeThing")

// on Run
enclosingScopeA() 
//instance: 1930418516 //res0: String = something

enclosingScopeB() 
//instance: 323825454 //res1: String = something
```

If we see the instances of StringConverter used they are different. Now imagine this happening across a large project. In such cases, one should always create an **implicit’s cache** and use it to ensure the implicits are created only once like below:

```scala
object ImplicitCache { 
    implicit val stringConverter = StringConverter[String] 
}

def enclosingScopeA():String = { 
    import ImplicitCache._
    implicitTestMethod("SomeThing")
}

def enclosingScopeB(): String = {
    import ImplicitCache._
    implicitTestMethod("SomeThing")
}
```

When run, uses the same instance throughout:

```scala
// on Run
enclosingScopeA()
//instance: 1281624893 //res0: String = something  

enclosingScopeB()
//instance: 1281624893 //res1: String = something
```

That’s it!

I hope this helps understanding implicits better and aids in using them elegantly, utilizing all the awesomeness it provides.