#!/usr/bin/env ammonite

/**
* +++++++++++++++
* Prerequisities:
* +++++++++++++++
*
* In order to run the script you need to have ammonite installed:
*
* sudo curl -L -o /usr/local/bin/amm https://git.io/vdNv2 && sudo chmod +x /usr/local/bin/amm && amm
*
* Or try your default package manager, at least it exists in `brew`
*
* Java is probably a prerequisite!
*
* +++++++++++
* How to run:
* +++++++++++
* The scripts needs a running docker container instance.
*
* If you have installed ammonite, it should be enough to start it like this:
*
* ProductionSimulator --dockerId <provide id of the running ella docker container>

* The script can also be started with amm directly:
* amm TestDataGenerator.sc --dockerId <provide id of the running ella docker container>
*
* You have to restart the docker container after the script has finished, or kill the
* `analyis_watcher.py` script manually.
*
* +++++++++++++
* What it does:
* +++++++++++++
*
* Simulates production environment to make it possible to test the analysis_watcher.py script.
*
* +++++++++++++
* How it works:
* +++++++++++++
*
* The script is based on Streams created by fs2 scala library. It concatenates the following two Streams:
* 1.)  preparations - database reset and creation
* 2.)  Three parallell streams running in 3 threads, consisting of analysisWatcher, analysisStream, readyStream
*
* The three parallel streams will start to run only after the preparations stream has finished.
*
* - analysisWatcher runs the python script `analysis_watcher.py` in `/ella/src/vardb/watcher`.
* - analysisStream creates an analysis folder according to `TestAnalysis-001`.
* - readyStream adds the READY flag inside the folder after the analysisStream has created the analysis folder.
*
* IMPORTANT REMARKS: The analysisStream and readyStream runs with random delays given with the flags CONFIG_DELAY and READY_DELAY
*
* Ammonite is an amazing tool created by Li Haoyi!
*
* It combines the Scala language with shell scripting almost as nice as in Python
*
*/

// helper library for Threadpool creation for fs2
import $ivy.`co.fs2::fs2-core:0.10.0-M9`
import $ivy.`co.fs2::fs2-io:0.10.0-M9`

import $file.FS2ThreadHelper, FS2ThreadHelper._
import FS2Helper._ //, FS2Helper.scheduler, FS2Helper.ec

// json library
import $ivy.`org.json4s::json4s-native:3.5.3`

// json imports
import org.json4s._
import org.json4s.native.Serialization
import org.json4s.native.Serialization.{write}

// fs2 - functional streams imports
import fs2._
import cats.effect.IO
import scala.concurrent.duration._

// ammonite shell imports
import ammonite.ops._
import ammonite.ops.ImplicitWd._
// shortening the write method to wr to avoid naming conflicts with other libraries
import ammonite.ops.{write => wr}

/**
  * Settings and utility functions and values
  */

val CONFIG_DELAY = 30.seconds
val READY_DELAY = 20.seconds
val NR_OF_THREADS = 3

def log[A](prefix: String): Pipe[IO, A, A] = _.evalMap { a =>
  IO{println(s"$prefix> $a"); a }
}

def randomDelays[A](max: FiniteDuration): Pipe[IO, A, A] = _.flatMap { a =>
  val delay = scala.util.Random.nextInt(max.toMillis.toInt)
  println(s"generated delay: $delay ms ")
  scheduler.delay(Stream.eval(IO(a)), delay.millis)
}

// The working directory for the script
val wd = pwd

/**
  * Data Model and Json support
  */

case class Params(genepanel: String)

case class Config(
   params: Params,
   name: String,
   `type`: String,
   priority: Int,
   samples: Array[String] = Array.empty[String]
)

implicit val formats = Serialization.formats(NoTypeHints)
val namePostfix = "TestAnalysis-00"

case class Analysis(
  id: Int,
  folderName: String,
  fileName: String,
  json: String,
  genepanelName: String,
  genepanelVersion: String
)

// Pure Stream of analysis config data
val datamodelStream: Stream[IO, Analysis] = Stream(2,3,4,5,6).map { n =>
  val analysisName = s"$namePostfix$n"
  val genepanelName = s"1GP$n"
  val genepanelVersion = s"v$n"
  val config = Config(
      params = Params(s"${genepanelName}_${genepanelVersion}"),
      `type` = "exome",
      name = s"$namePostfix$n",
      priority = n
    )
  Analysis(
    n,
    json = write(config),
    folderName = analysisName,
    fileName = s"$analysisName.analysis",
    genepanelName = genepanelName,
    genepanelVersion = genepanelVersion
  )
}

/**
  * IO side effects, creating analysis folders, inserting into database
  */

val analysisFolder = wd/up/'testdata/'analyses

val setReady: Sink[IO, String] = _.evalMap { folderName =>
    IO {
        val path = analysisFolder/folderName
        wr(path/"READY", "")
    }
}

def createTestConfig(dockerContainerId: String): Sink[IO, Analysis] = _.evalMap { a =>
  IO {

    val insert =
    s"""insert into genepanel (name, version, genome_reference, config ) values (
          '${a.genepanelName}', '${a.genepanelVersion}', 'GRCh37' , '{}'
    )"""

    // running the insert statement at the simplest possible way through bash
    val result = %%('docker, 'exec, dockerContainerId, 'psql, "-U", 'postgres, "-d", 'postgres, "-c", insert)

    val path = analysisFolder/a.folderName
    val file = path/a.fileName

    // the `bang` is Ammonite syntax for the same shell operation as in bash.
    // The ammonite shell operations are usually more forceful, they don't
    // care if files exists, or folders are missing in a path.
    mkdir! path

    // Copying test data from previous vcf sample, sometimes this may fail, but
    // that is intentional, to see that the analyse_watcher.py script can cope with it ...
    cp(analysisFolder/s"TestAnalysis-00${a.id - 1}"/s"TestAnalysis-00${a.id - 1}.vcf", analysisFolder/a.folderName/s"TestAnalysis-00${a.id}.vcf")

    println("data copied, writing testdata: " + file)
    println(a.json)

    wr(file, a.json)
  }
}


 case class Program(dockerContainerId: String) {
  // transforming the pure dataModelStream into one for
  // generating analysis data and one for setting the READY FLAG
  val analysisStream = datamodelStream.covary[IO].to(createTestConfig(dockerContainerId))
  val readyStream = datamodelStream.map { c => c.folderName }.through(randomDelays(READY_DELAY)).to(setReady)

// resetting the database
  val preparations = {
  mkdir! wd/up/'testdata/'destination
  %('docker, 'exec, dockerContainerId, "ella-cli", 'database, 'drop, "-f")
  %('docker, 'exec, dockerContainerId, "ella-cli", 'database, 'make, "-f")
  %('docker, 'exec, dockerContainerId, 'make, 'dbreset)
  }

// Stream for starting the analysis_watcher.py script
val analysisWatcher = Stream.eval( IO {
  %('docker, 'exec, dockerContainerId, 'python, "src/vardb/watcher/analysis_watcher.py", "--analyses", "src/vardb/watcher/testdata/analyses", "--dest", "src/vardb/watcher/testdata/destination")
})


}

@doc("""Runs a production simulator for providing analysis data, then starts the analysis_watcher.py script and test that it works""")
@main
def main(dockerId: String @doc(
  "You need to provide the Id for the `running` ella docker container you want to test: `docker ps`"
)) {
 val program = Program(dockerId)

println("creating new analysis and setting the READY flag at random intervals ..")

// running analysisStream and readyStream in parallell on NR_OF_THREADS given.
// ready flag will always be set after the initial test data are created, but
// ready flag for test data 2 may be set after test data 1.
 val run = Stream(program.preparations) ++
   Stream(program.analysisWatcher, program.analysisStream, program.readyStream)
     .join(NR_OF_THREADS)
     .through(randomDelays(CONFIG_DELAY))
     .through(log("analysis sample added and ready for pickup!"))

run.run.unsafeRunAsync(println)
println("exiting ..")
// program.program.covary[IO].run.unsafeRunAsync(println)
}

