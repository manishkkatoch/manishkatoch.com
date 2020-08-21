---
title: Introducing Scala Cypher DSL
titleImage:
    url: /images/cypher.jpg
    credits: Joel Naren | https://unsplash.com/@joeljnaren
    source: Unsplash | https://unsplash.com
description: Introducing a framework which allows writing type safe complex Neo4J Cypher queries in Scala.
date: 2019-07-19
publications:
    - Neo4J Developer Blog| https://medium.com/neo4j/introducing-scala-cypher-dsl-51d28588cd51

layout: layouts/post.njk
tags: ["tech", "scala", "opensource", "neo4j"]
---

>A type-safe, compile-time DSL for Neo4J Cypher Query Language in Scala

Working with [Neo4J](https://neo4j.com/) at [ThoughtWorks](https://www.thoughtworks.com/), I had a major qualm regarding the way we were interacting with the graph database using Cypher. Cypher is a declarative language, and hence, it is tricky to compose it programmatically. This is the reason why most of the ORMs (or micro-ORMs) for Neo4J are effective only for simple use-cases. We observed that, as the scale and complexity of our business logic started to increase, our code fragmented into two distinct flavours. There were Scala models and business implementations. And then there were string generation and manipulation methods to generate Cypher queries.

String-based queries have inherent issues like no type-safety, minimal syntax checking, difficulty in composing directly proportional to complexity, etc.

_[Scala-cypher-DSL](https://github.com/manishkkatoch/scala-cypher-dsl) aims to leverage the models created as part of business logic and create Cypher queries intelligently and type-safe manner._

#### Installation

Binary release artefacts are published to the Sonatype OSS Repository Hosting service and synced to Maven Central.

SBT
```scala
"me.manishkatoch" %% "scala-cypher-dsl" % "0.4.6"
```

Gradle
```groovy
implementation group: 'me.manishkatoch', name: 'scala-cypher-dsl', version: '0.4.6'
```

#### Usage

Consider following domain models representing people working in a fictitious department and friendly by nature.

```scala
//sample domain models
case class Person(id: String, name: String, age: Int)
case class WorksIn(sinceDays: Int)
case class IsFriendOf(since: Int, lastConnectedOn: String)
case class Department(id: String, name: String)
```

To start writing query DSL, import the following

```scala
import me.manishkatoch.scala.cypherDSL.spec.syntax.v1._
import me.manishkatoch.scala.cypherDSL.spec.syntax.patterns._ //optional, import for expressing paths.
```

using DSL for a simple match query generation for an instance of model

```scala
//for a person John Doe
val johnDoe = Person("AX31SD", "John Doe", 50)

//match and return Neo4J data
val johnDoeQuery = cypher.MATCH(johnDoe)
    .RETURN(johnDoe)
    .toQuery()

johnDoeQuery.query
//res0: String = MATCH (a0:Person {id: {a0_id},name: {a0_name},age: {a0_age}})
// RETURN a0

johnDoeQuery.queryMap
//res1: scala.collection.immutable.Map[String,Any] = Map(a0_id -> AX31SD, a0_name -> John Doe, a0_age -> 50))
```

match Person only by a property(e.g. name)

```scala
//for a person John Doe
val johnDoe = Person("AX31SD", "John Doe", 50)

//match and return Neo4J data
val johnDoeQuery = cypher.MATCH(johnDoe('name))
    .RETURN(johnDoe)
    .toQuery()

johnDoeQuery.query
//res0: String = MATCH (a0:Person {id: {a0_id},name: {a0_name},age: {a0_age}})
//              RETURN a0

johnDoeQuery.queryMap
//res1: scala.collection.immutable.Map[String,Any] = Map(a0_id -> AX31SD, a0_name -> John Doe, a0_age -> 50))
```

>_Note_: if the property doesn’t exist, compilation will fail. Yay!

using DSL for matching any instance of model.

```scala
//for any person
val anyPerson = any[Person] // any instance of node labelled Person

val result = cypher.MATCH(anyPerson)
    .RETURN(anyPerson)
    .toQuery()

result.query
//res0: String = MATCH (a0:Person)
//               RETURN a0

result.queryMap
//res1: scala.collection.immutable.Map[String,Any] = Map()
query for all the friends of John Doe in Science department

val scienceDept = Department("ZSW12R", "Science")
val anyPerson = any[Person]
val isFriendOf = anyRel[IsFriendOf] //any relation instance of label IsFriendOf

val result = cypher.MATCH(johnDoe -| isFriendOf |-> anyPerson <-- scienceDept)
    .RETURN(anyPerson)
    .toQuery()

result.query
//res0: String = MATCH (a0:Person {id: {a0_id},name: {a0_name},age: {a0_age}})-[a1:IS_FRIEND_OF]->(a2:Person)<--(a3:Department {id: {a3_id},name: {a3_name}})
//               RETURN a2

result.queryMap
//res1: scala.collection.immutable.Map[String,Any] = Map(a0_id -> AX31SD, a0_name -> John Doe, a3_name -> Science, a0_age -> 50, a3_id -> ZSW12R)
```

for detailed DSL usage and more examples, there is a [wiki](https://github.com/manishkkatoch/scala-cypher-dsl/wiki).

Support and Contributions

[Scala-cypher-DSL](https://github.com/manishkkatoch/scala-cypher-dsl) aims to be an important library for anyone who wants to write idiomatic scala when interacting with Neo4J or any other cypher query language based platform.I aim to support 100% of cypher specification and any form of contribution (issue report, PR, etc) is more than welcome!