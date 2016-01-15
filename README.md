# GeoAnnotate

GeoAnnotate is a javascript application built to collect toponym and document-level geographic annotations. It is designed to work with Parse (https://www.parse.com/), a free backend service. Currently it is not hosted on any publicly accessible servers. 
A screenshot of the application in action:

![toponym-annotate](https://github.com/utcompling/GeoAnnotate/blob/master/GeoAnnotate_Screenshot.png)

## WarOfTheRebellion corpus

The associated annotated corpus built using GeoAnnotate from the War of the Rebellion (a large set of American Civil War archives) is available [here](https://github.com/utcompling/WarOfTheRebellion/).

## Setting up GeoAnnotate to run locally

### Mac OSX

(1) Make sure that your computer is serving at localhost. There are many guides to doing this on OSX and there are small differences for every possible version. One guide is (http://coolestguidesontheplanet.com/install-configure-apache-mysql-php-phpmyadmin-osx-10-8-mountain-lion/). Once you can type in localhost/index.html into your url bar and see a page saying It Works! proceed to next step.

(2) Download the GeoAnnotate zip file (https://github.com/utcompling/GeoAnnotate/archive/master.zip)

(3) Decompress the folder and put it anywhere. (e.g. `/Users/name/devel/GeoAnnotate-master`)

(4) Open the terminal and navigate to where your computer is serving localhost. This is different for different versions of OS X. One common place is in `/Library/WebServer/Documents` 

`cd /Library/WebServer/Documents`

(5) Create a directory called MapEditor in this directory. (`mkdir MapEditor`)

(6) Create a symbolic Link between this directory and the MapEditor folder inside GeoAnnotate-master. 

`ln -s /Users/name/devel/GeoAnnotate-master/MapEditor /Library/WebServer/Documents/MapEditor`

(7) Open Chrome and type `localhost/MapEditor/toponym-annotate.html` or `localhost/MapEditor/article-annotate.html` or `localhost/MapEditor/docgeo-annotate.html` in the url bar. You should see now see the application.

### Windows

(1) Go to Control Panel > Programs > Turn Windows Features On or Off

(2) Check the box labeled "Internet Information Services"

(3) Download the GeoAnnotate zip file (https://github.com/utcompling/GeoAnnotate/archive/master.zip)

(4) Decompress the folder and put it on the C drive (C:\GeoAnnotate-master)

(5) find the "cmd" application and right click > run as Administrator

(6) Navigate to where localhost is served on your machine. On my windows machine that was accomplished by `cd C:\inetpub\wwwroot`

(8) Symbolic link the localhost directory and the folder that was unzipped to the C drive. 

`mklink /d "C:\inetpub\wwwroot\GeoAnnotate-master" "C:\GeoAnnotate-master"`

(9) Open Chrome and type `/localhost/GeoAnnotate-master/MapEditor/toponym-annotate.html` or `/localhost/GeoAnnotate-master/MapEditor/docgeo-annotate.html` or `/localhost/GeoAnnotate-master/MapEditor/article-annotate.html` in the url bar. You should now see the application.




