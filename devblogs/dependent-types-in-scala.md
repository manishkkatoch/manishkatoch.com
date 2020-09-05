---
title: Dependent Types in Scala — A practical example
excerpt: An example by which we demonstrate how we can add constraints to business domain for compile time validation of business logic!
image: https://source.unsplash.com/4zwozQxDbD4/1600x900
imageCredit: Guilherme Cunha | https://unsplash.com/@guiccunha
imageSource: Unsplash | https://unsplash.com
publications:
    - Signify Technology | https://www.signifytechnology.com/blog/2019/08/scala-snippets-number-2-dependent-types-in-scala-a-practical-example-by-manish-katoch
date: 2019-03-14
layout: layouts/post.njk
tags: ["devblogs","scala", "patterns"]
---

Of late, I have been fascinated with type-level programming in Scala. The more I play with it, the more I get excited about it. Although most of my production implementations have been at the framework level, there is no reason why it cannot be utilized to drive business logic.

Let’s try to build our understanding of this paradigm using a trivial but a practical use case.

_Acme_ online store has a flourishing business. They have a membership status associated with each of their customers in the form of _Acme Cards_. It’s a usual loyalty program with three tiers: _Platinum_, _Gold_ and _Silver_. It is also a festive season and Acme has decided to give flat discounts for each tier. One of the backend API (they have a UI and BFF setup) of the Acme store needs to display the membership details and the applied discount.

The following story sums up the expected behaviour:

>
>**Given** the online store has members with platinum, gold, silver AcmeCards and the store has discount schemes associated with memberships
>
>**When** a member puts item in cart and checks out his/her cart
>
>**Then** display member’s membership, the discount applied and the points required for next upgraded membership.

Now, a classical way of implementing this would be to have a repository to get the member and its type from the database given an identifier. We can further derive AcmeCard subscription for the identified member. But if we pause and rethink, we realise that we are writing all of the logic to make necessary selections. _All the validations are done, decisions are made, flows are selected, at the run time_. This leaves our interface prone to runtime errors. Wouldn’t it be great if the compiler could help us predict such errors at compile time itself?

Scala can. **If we code for types not for data**.

>Type Level programming is a paradigm, when provided with a well constrained strongly type system, allows dynamic flows generation at compile time.

A strong type system is one where the types are strictly constrained and the relationships established. The constraints guide the compiler to make decisions at certain compile points as well as predict if the compiled code succeed when run. If we constrain our system correctly, we can defer all the relevant object creation on compiler!

**How do we go about it?** To begin with, since all our computations are going to be based on types, each of our concerns should be represented by types.Member type represents a customer of Acme. For the sake of simplicity, we will only consider system identifier, names and the points accrued.

```scala
case class Member(id: String, name: String, points: Long = 0)
```

`MemberType` determines whether the member is a first time customer, or a frequent shopper or a patron of Acme Store.

```scala
trait MemberType {val member: Member}case class FirstTimer(member: Member) extends MemberType
case class FrequentShopper(member: Member) extends MemberType
case class Patron(member: Member) extends MemberType
```

`AcmeCard` represents the membership levels.

```scala
abstract class AcmeCard(member: Member, levelName: String)

case class Silver(member: Member) extends AcmeCard(member,"silver")
case class Gold(member: Member) extends AcmeCard(member,"gold")
case class Platinum(member: Member) extends AcmeCard(member,"platinum")

```

`Discounted` type represents what kind of discounts are associated with each AcmeCard. Now to make a decision, the compiler needs to know how to choose and create a type. This means that concern types like `Discounted` must be [implicitly instantiable](/tech/dependent-types-in-scala/) as shown below.

```scala
trait Discounted[T] {
    def getDiscount: Double 
}

object Discounted { 
    // apply method called by compiler to instantiate if no instance found
    def apply[T](implicit discounted: Discounted[T]) = discounted
    
    def createDiscounted[T](fn: () => Double) = new Discounted[T] {
        override def getDiscount: Double = fn()
    }
    
    //implicit instances of Discounted for each Membership Card
    implicit val silverCardDiscounted: Discounted[Silver] = createDiscounted( () => 5.0)
    implicit val goldCardDiscounted: Discounted[Gold] = createDiscounted(() => 10.0)
    implicit val platinumCardDiscounted: Discounted[Platinum] = createDiscounted(() => 15.0) 
}

```

`AcmeCardPrinter` provides a trait that emits trademark marketing names for the AcmeCards.

```scala
trait AcmeCardPrinter[T] { 
    def print(t: T): String
}

object AcmeCardPrinter {
    def apply[T](implicit prettyPrinter: AcmeCardPrinter[T]): AcmeCardPrinter[T] = prettyPrinter
    
    implicit val silverAcmeCardPrinter: AcmeCardPrinter[Silver] = new AcmeCardPrinter[Silver] { 
        override def print(t: Silver): String = "AcmeCard® Silver Start™"
    }
    
    implicit val goldAcmeCardPrinter: AcmeCardPrinter[Gold] = new AcmeCardPrinter[Gold] {
        override def print(t: Gold): String = "AcmeCard® Gold Delight™"
    }
    
    implicit val platinumAcmeCardPrinter: AcmeCardPrinter[Platinum] = new AcmeCardPrinter[Platinum] {
        override def print(t: Platinum): String = "AcmeCard® Platinum Awesomeness™"
    }
}
```

`UpgradeRequirementCheck` trait provides the points required for the next AcmeCard upgrade. It has some additional logic to determine the points required by the customer.

```scala
trait UpgradeRequirementCheck[T] {
    def pointsToUpgrade(currentPoint: Long): Long
}

object UpgradeRequirementCheck {
    def apply[T](implicit upgradeEligibility: UpgradeRequirementCheck[T]) = upgradeEligibility
    
    def createUpgradeEligibility[T](fn:() => Long) = new UpgradeRequirementCheck[T] {
        override def pointsToUpgrade(currentPoint: Long): Long = {
            val targetPoints = fn()
            if (targetPoints > 0 && targetPoints > currentPoint)
                targetPoints - currentPoint
            else 0
        }
    }

    implicit val firstTimerUpgrade: UpgradeRequirementCheck[Silver] =
        createUpgradeEligibility( () => 10000L)
    implicit val frequentShopperUpgrade: UpgradeRequirementCheck[Gold] =
        createUpgradeEligibility(() => 100000L)
    implicit val patronDUpgrade: UpgradeRequirementCheck[Platinum] =
        createUpgradeEligibility(() => 0L) 
}
```

Now let’s revisit our story. Given a member, we need to display his/her _AcmeCard information, the points required for the next upgrade and the discount applicable_ for further purchases. We have `Member` type to work with but our traits `UpgradeRequirementCheck`,`AcmeCardPrinter` and `Discounted` work with `AcmeCard` type. We need to find a way to map `Member` to AcmeCard. Given a `Member`, we need to find the appropriate `AcmeCard` and then have Scala figure out relevant instances for traits `UpgradeRequirementCheck`,`AcmeCardPrinter` and `Discounted`.

**For type mapping**, let’s introduce `Privilege` trait which provides a way to capture the mapped type in a publicly exposed type variable.

```scala
trait Privilege[T] { 
    type OutType
    def getMember(t: T): OutType
}
object Privilege { 
    type Aux[T, R] = Privilege[T] { 
        type OutType = R
    }
    
    def apply[T](implicit privilege: Privilege[T]): Aux[T, privilege.OutType] = privilege
    
    implicit def materializeSilverCard[R]: Aux[FirstTimer,Silver] = new Privilege[FirstTimer] { 
        type OutType = Silver
        override def getMember(t: FirstTimer): OutType = Silver(t.member)
    }
    
    implicit def materializeGoldCard[R]: Aux[FrequentShopper,Gold] = new Privilege[FrequentShopper] {
        type OutType = Gold
        override def getMember(t: FrequentShopper): OutType = Gold(t.member) 
    }
    
    implicit def materializePlatinumCard[R]: Aux[Patron,Platinum] = new Privilege[Patron] { 
        type OutType = Platinum
        override def getMember(t: Patron): OutType = Platinum(t.member)
    }
}
```

>The design pattern is also known as [Aux Pattern](http://gigiigig.github.io/posts/2015/09/13/aux-pattern.html) and is an important tool in your tool-set. You will invariably use Aux pattern when working with type-level programming.

With `Privilege` defined, we can see below how the type conversion would happen on runtime and also how we get the corresponding AcmeCard for a given member type.

```scala
//members
val johnDoe = FirstTimer(Member("123456","John Doe"))
val janeDoe = FrequentShopper(Member("567890","Jane Doe", 50500))

//A sample function to get a mapper to give a AcmeCard of type R for a member of type T
def getPrivilegeType[T,R](member: T)(implicit privilege: Privilege.Aux[T,R]) =privilege

getPrivilegeType(janeDoe)
/*res0: Privilege.Aux[FrequentShopper,Gold] = Privilege$$anon$2@2039920d*/

getPrivilegeType(johnDoe)
/*res0: Privilege.Aux[FirstTimer,Silver] = Privilege$$anon$1@3599162f*/
```

All we need to do now is to forward this type to the respective downstream handlers and Scala compiler can take care of the rest! Let’s take a look at the final piece:

```scala
def getMembershipInformation[T <: MemberType,R](memberType: T)(implicit
    privileged: Privilege.Aux[T,R],
    printer: AcmeCardPrinter[R],
    upgradeEligibility: UpgradeRequirementCheck[R],
    discounted: Discounted[R] ): String = {
        val pointsToUpgrade = upgradeEligibility.pointsToUpgrade(memberType.member.points)
        val discount = discounted.getDiscount
        val cardName = printer.print(privileged.getMember(memberType))
        val memberName = memberType.member.name
        
        s"Dear $memberName\n" + s"You are proud owner of $cardName\n" + s"We have applied special discount of $discount%\n" + s"Psst! you need $pointsToUpgrade points for next upgrade!"
}
```

What’s going on here? When Scala sees a call for `getMembershipInformation` for a given `Member`, it tries to bring (import or create) a `Privilege.Aux` type into scope. As we have seen above, The Aux will provide the `AcmeCard` type in R. This _“captured"_ type can be further used in the _same call scope_ to import or instantiate other required implicit instances.

Let’s see this in action:

```scala
import AcmeCardPrinter._
import Privilege._
import Discounted._
import UpgradeRequirementCheck._

getMembershipInformation(johnDoe)
/*res0: String =
Dear John Doe
You are proud owner of AcmeCard® Silver Start™
We have applied special discount of 5.0%
Psst! you need 10000 points for next upgrade!*/

getMembershipInformation(janeDoe)
/*res0: String =
Dear Jane Doe
You are proud owner of AcmeCard® Gold Delight™
We have applied special discount of 10.0%
Psst! you need 49500 points for next upgrade!*/
```

And that marks our story done (Dev Done at least)!.

We created highly disconnected components, defined our business domain using constrained implicit methods. Any change in such setup, will provide feedback at compile time and ensure that application sanity (domain-wise) is not compromised. Type-level programming is a very effective tool which, I firmly believe, has a place in writing domain rich applications, not just frameworks. Give it a shot!
