---
title: Type safety and Spark Datasets in Scala
excerpt: Making Datasets in Spark generically type safe!
image: https://source.unsplash.com/WeA1uHnzf60/1600x900
imageCredit: Tuân Nguyễn Minh | https://unsplash.com/@tuannguyenminh
imageSource: Unsplash | https://unsplash.com
publications:
    - codeburst.io | https://codeburst.io/type-safety-and-spark-datasets-in-scala-20fa582024fc
    - Signify Technology | https://www.signifytechnology.com/blog/2019/03/type-safety-and-spark-datasets-in-scala-by-manish-katoch
date: 2019-01-01
layout: layouts/post.njk
tags: ["devblogs", "scala", "data-engineering"]
---

Working with Spark Datasets have been quite interesting and most of the time rewarding in our current project. It has a simple yet powerful API that abstracts out the need to code in complex transformations and computations. To be honest, we also have a fairly straightforward use case: few domain entities, fewer transformations based on simple joins.

However, there are also few things that have been counterproductive to us but I am going to focus on one of them: lack of type safety in some operations, particularly, joins.

```scala
dataSetA.join(dataSetB, "columnA")
```

The above code will fail on runtime if either of dataSetA and dataSetB (or both) don’t have “columnA” column. This is a waste of resources at multiple levels: from precious CPU cycles to developer’s time. In the remainder of this blog, we will add compile-time safety to join operations and learn a lot in the process.

>**Before we proceed**, a disclaimer: This is not an unsolved problem. [Frameless](https://github.com/typelevel/frameless) does a fantastic job at providing the type-safety for Datasets. However, it is a very evolved and complete framework which provides a newer abstraction of TypedDatasets and we really did not want to add an external dependency when we just wanted to have type safety in our select Dataset methods. The solution we are going to formulate is what Frameless does which inturn leverages on generic programming using awesome [Shapeless](https://github.com/milessabin/shapeless).

---

#### Problem Statement

Let’s come up with goals we want to achieve at the end of this post:

1. When we access a column by name, the compilation should fail if the column does not exist in the dataset.
2. When we join two datasets, the compilation should fail if the joining column is not part of either one of the dataset or if present, not of the same type.
3. Some good DSL for doing above never hurts!

---

#### Step 0: Basics

For any Dataset of type T (case class/Product type), we need to understand all the properties of type T along with their types. This means that we want to move from a _specialized_ T to _generalized_ list of properties with types. and this, in a very very simplified way of explanation, is what _Shapeless_ provides. It provides a conversion to and from a **case class** and a **heterogeneous list (HList)** and a bouquet of functions to apply on the list. The best material to read about shapeless is [this](https://books.underscore.io/shapeless-guide/shapeless-guide.html) and I strongly suggest to give it a thorough read.

For now, we can do with a knowledge that shapeless provides an interface LabelledGeneric which provides the interface.

This can be explained as below:

```scala

case class Person(name: String, age: Int, isEmployee: Boolean)
//defined class Person

generic = LabelledGeneric[Person]
//generic: shapeless.LabelledGeneric[Person]{type Repr = shapeless.::[String with shapeless.labelled.KeyTag[Symbol with shapeless.tag.Tagged[String("name")],String],shapeless.::[Int with shapeless.labelled.KeyTag[Symbol with shapeless.tag.Tagged[String("age")],Int],shapeless.::[Boolean with shapeless.labelled.KeyTag[Symbol with shapeless.tag.Tagged[String("isEmployee")],Boolean],shapeless.HNil]]]}

//usage:
val person = Person("John Doe", 32, true)

val hlist = generic.to(person)
//hlist: generic.Repr = John Doe :: 32 :: true :: HNil

HNilgeneric.from(hlist)
//res0: Person = Person(John Doe,32,true)

```
---

#### Step 1: Property Exists?

>_Given a type T, if there exists a property of name PName and type PType then yes, the conditions are satisfied_

```scala
@implicitNotFound(msg = "${PName} not found in ${T}")
trait PropertyExists[T, PName, PType]

object PropertyExists {
  def apply[T, PType](column: Witness)(
      implicit exists: PropertyExists[T, column.T, PType]): PropertyExists[T, column.T, PType] =
    exists

  implicit def implicitProvider[T, H <: HList, PName, PType](
      implicit
      gen: LabelledGeneric.Aux[T, H],
      selector: Selector.Aux[H, PName, PType]
  ): PropertyExists[T, PName, PType] = new PropertyExists[T, PName, PType] {}
}
```

Let’s break down the gist line by line:

1. We define a trait PropertyExists for type T which also expects types PName ( for Property Name) and PType ( for Property Type), we don’t worry about the properties/methods of the trait as the existence of such instance is truthfulness of our condition.
2. We define an `apply` method which accepts a Witness and implicitly expects an instance of PropertyExists for a certain PType. Witness is one of the utility abstractions of Shapeless which given a Symbol returns handle to its type and value.
3. But how to do we pass the implicit parameter of PropertyExists? Also, where are we looking for the properties? well, the implicit is provided by implicitProvider which rely on LabelledGeneric that we introduced above. It takes a couple of more implicitly created parameters. Let’s dissect them:

```scala
implicit gen: LabelledGeneric.Aux[T, H]
```

gen provides the heterogenous list (HList) representation of type T. It uses the [Aux Pattern](http://gigiigig.github.io/posts/2015/09/13/aux-pattern.html) (another must read for type-level programming!) to forward the result type to the next implicit parameter creation

```scala
selector: Selector.Aux[H, PName, PType]
```

The Selector is one of the simpler abstraction of Shapeless which provides the PType given it finds the propertyName PName in record H.

So in simpler terms, the implicitProvider talks the following:

>For a given **type T**, if you are able to create a **HList** of type **H** from **LabelledGeneric[T]** and then if you are able to also **select PType** from that HList **H** a property of name **PName**, then go ahead and provide a **PropertyExists** instance for type **T**, **PName** and **PType**.

---

#### Step 2: First Test of Type Safety

Now that we have our PropertyExists, let's have our first stab at type safety: Creating a Column instance from a key and failing on compile time if it doesn’t exist.

```scala
object syntax {
  implicit class RichDataSet[A](dataSet: Dataset[A]) {
    val enriched = this
    def apply[K](column: Witness.Lt[Symbol])
        (implicit exists: PropertyExists[A, column.T, K]): Column =
      new Column(column.value.name)
  }
}
```

We define a RichDataset abstraction which extends spark Dataset to provide the functionality of type checking.

We add an apply method which takes a Symbol and implicitly tries to get a PropertyExists instance for the column type column.T (Aux pattern at play here too!). Like always this will compile only if the column exists in A.

If we take our above case class Person, the following behaviour should be observed:

```scala
personDs = Seq(persons).toDS().enriched

val ageColumn: Column = personDs('age) 
//compiles

val nameColumn: Column = personDs('namesss)
//Error:(36, 56) Symbol with shapeless.tag.Tagged[String("namesss")] not found in Person
```
and that is our first milestone!

>_PS: we need to expose enriched as the compile will pick apply method of Dataset and not that of RichDataset._

---

#### Step 3: Let’s Join

Now that we have established the usage of PropertyExists lets try to formulate a DSL we would want to use for carrying out our joins

```scala
//for left join//natural join single key reference
datasetA.leftJoin(datasetB).withKey('key)

//natural join multiple keys
datasetA.leftJoin(datasetB).on('key1, 'key2)

//for joins not natural.
datasetA.leftJoin(datasetB) where { 
    datasetA('keyA) === datasetB('keyB)
}
```

seems pretty ok. Let’s dive in!

```scala
class JoinDataSet[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String)
object JoinDataSet {
  def apply[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) = new JoinDataSet(lhs, rhs, joinType)
  def leftJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])                = JoinDataSet(lhs, rhs, "leftOuter")
  def rightJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])               = JoinDataSet(lhs, rhs, "rightOuter")
  def fullOuterJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])           = JoinDataSet(lhs, rhs, "fullOuter")
}
```

We introduce a JoinDataSet which provides the syntactical sugar to facilitate the actual join operations. JoinDataSet will also provide us with the final methods of actual join as decided in DSL: _withKey_, _on_ and _where_.

##### .withKey

```scala
class JoinDataSet[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) {
  
  def withKey[K](column: Witness.Lt[Symbol])(implicit
                                             lhsExists: PropertyExists[L, column.T, K],
                                             rhsExists: PropertyExists[R, column.T, K]): DataFrame =
    doJoin(Seq(column.value.name))

  private def doJoin(columns: Seq[String]) = lhs.join(rhs, columns, joinType)
}

object JoinDataSet {
  def apply[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) = new JoinDataSet(lhs, rhs, joinType)
  def leftJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])                = JoinDataSet(lhs, rhs, "leftOuter")
  def rightJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])               = JoinDataSet(lhs, rhs, "rightOuter")
  def fullOuterJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])           = JoinDataSet(lhs, rhs, "fullOuter")
}
```
As we can see, withKey is identical to what we achieved in our step 2 with a couple of notable differences.

>_for a Symbol column, we check if PropertyExists for both Dataset[L] and Dataset[R] and also for both datasets the type is K._

This enforces that not only column name should be the same, but also their type.

##### .where

```scala
private[datasets] class JoinDataSet[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) {
  
  def where(column: => Column): DataFrame = doJoin(column)

  private def doJoin(columns: Seq[String]) = lhs.join(rhs, columns, joinType)
  private def doJoin(columns: Column)      = lhs.join(rhs, columns, joinType)

}

object JoinDataSet {
  def apply[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) = new JoinDataSet(lhs, rhs, joinType)
  def leftJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])                = JoinDataSet(lhs, rhs, "leftOuter")
  def rightJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])               = JoinDataSet(lhs, rhs, "rightOuter")
  def fullOuterJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])           = JoinDataSet(lhs, rhs, "fullOuter")
}
```

_.where_ is even simpler. It takes a nullary function which returns a Column and leverages on the way we express conditions on Column. To express Column we use the apply method we created

##### .on

```scala
class JoinDataSet[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) {
  object on extends SingletonProductArgs {
    def applyProduct[V <: HList, K](columns: V)(implicit
                                                i0: ToTraversable.Aux[V, List, Symbol],
                                                lhsExists: PropertiesExists[L, V, K],
                                                rhsExists: PropertiesExists[R, V, K]): DataFrame =
      doJoin(columns.toList[Symbol].map(_.name))

  }

  private def doJoin(columns: Seq[String]) = lhs.join(rhs, columns, joinType)
  private def doJoin(columns: Column)      = lhs.join(rhs, columns, joinType)

}

object JoinDataSet {
  def apply[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) = new JoinDataSet(lhs, rhs, joinType)
  def leftJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])                = JoinDataSet(lhs, rhs, "leftOuter")
  def rightJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])               = JoinDataSet(lhs, rhs, "rightOuter")
  def fullOuterJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])           = JoinDataSet(lhs, rhs, "fullOuter")
}
```

As one can observe _.on_ is not a function at all! If we think on this and our definition of on method in the DSL, what we need to work on is the varargs of Symbol and for each such symbol have a PropertyExists created. Unfortunately, there is no way to convert a varargs to HList as varargs are Seq and Seq is not Product (case class type). For this Shapeless has provided a sugar abstraction SingletonProductArgs which uses dynamic programming to create an HList. the applyProduct is really an apply method on “on” object and allows us to achieve our syntax.

Here’s how the above code pans out:

>Given I have **varargs** to dynamically apply to a method named **“apply”** which gives out an **HList V**, and I can generate an implicit instance which gives **List of Symbols** out of it, and also for both the **Datasets**, **PropertiesExists** of **type K** in the **HList V**: do the Join.

Heres the complete code:

```scala
class JoinDataSet[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) {
  object on extends SingletonProductArgs {
    def applyProduct[V <: HList, K](columns: V)(implicit
                                                i0: ToTraversable.Aux[V, List, Symbol],
                                                lhsExists: PropertiesExists[L, V, K],
                                                rhsExists: PropertiesExists[R, V, K]): DataFrame =
      doJoin(columns.toList[Symbol].map(_.name))

  }

  def withKey[K](column: Witness.Lt[Symbol])(implicit
                                             lhsExists: PropertyExists[L, column.T, K],
                                             rhsExists: PropertyExists[R, column.T, K]): DataFrame =
    doJoin(Seq(column.value.name))

  def where(column: => Column): DataFrame = doJoin(column)

  private def doJoin(columns: Seq[String]) = lhs.join(rhs, columns, joinType)
  private def doJoin(columns: Column)      = lhs.join(rhs, columns, joinType)

}

object JoinDataSet {
  def apply[L, R](lhs: Dataset[L], rhs: Dataset[R], joinType: String) = new JoinDataSet(lhs, rhs, joinType)
  def leftJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])                = JoinDataSet(lhs, rhs, "leftOuter")
  def rightJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])               = JoinDataSet(lhs, rhs, "rightOuter")
  def fullOuterJoin[L, R](lhs: Dataset[L], rhs: Dataset[R])           = JoinDataSet(lhs, rhs, "fullOuter")
}
```

#### PropertiesExists?

For matching multiple properties, we create another trait like PropertyExists. While PropertyExists worked with single property PName, the PropertiesExists needs to work with HList. So we get our trait as:

```scala
trait PropertiesExists[T, PName <: HList, PType]
```

Now, like a List, HList also has 3 basic building blocks: Head, Tail and Nil (in this case HNil) where:

```scala
HList = Head :: Tail :: HNil
```

So all we need to do now is define implicitProviders for HNil, Tail and Head. Since the head is essentially a single Property, PropertyExists fits just fine! for the tail, we recursively try to create an implicit provider as we do for any List.

```scala
@implicitNotFound(msg = "${PName} not found in ${T}")
trait PropertiesExists[T, PName <: HList, PType]
object PropertiesExists {
  implicit def forHNil[T, PName, PType](
      implicit head: PropertyExists[T, PName, PType]): PropertiesExists[T, PName :: HNil, PType] =
    new PropertiesExists[T, PName :: HNil, PType] {}

  implicit def forHList[T, PNameHead, PNameTail <: HList, PTypeForHead, PTypeForTail](
      implicit headExists: PropertyExists[T, PNameHead, PTypeForHead],
      tailExists: PropertiesExists[T, PNameTail, PTypeForTail])
    : PropertiesExists[T, PNameHead :: PNameTail, PTypeForTail] =
    new PropertiesExists[T, PNameHead :: PNameTail, PTypeForTail] {}
}
```

we can complete our RichDataSet as below:

```scala
object syntax {

  implicit class RichDataSet[A](dataSet: Dataset[A]) {

    val enriched: RichDataSet[A] = this

    def apply[K](column: Witness.Lt[Symbol])(implicit lhsExists: PropertyExists[A, column.T, K]): Column =
      new Column(column.value.name)

    def leftJoin[B, K](withDataSet: Dataset[B]): JoinDataSet[A, B]      = JoinDataSet.leftJoin(dataSet, withDataSet)
    def rightJoin[B, K](withDataSet: Dataset[B]): JoinDataSet[A, B]     = JoinDataSet.rightJoin(dataSet, withDataSet)
    def fullOuterJoin[B, K](withDataSet: Dataset[B]): JoinDataSet[A, B] = JoinDataSet.fullOuterJoin(dataSet, withDataSet)
  }
}
```

And That’s it!

Pursuing type safety goes a long way in optimizing development flow, catching early issues (even before execution!) and most importantly helps writing meaningful unit tests. Apart from the type safety, I also wanted to share how Shapeless (and really generic type-level programming) can aid in writing succinct, compile-time and type-safe code and I hope I was able to do some justice to how awesome Shapeless and Frameless (for Spark Dataset) are!

