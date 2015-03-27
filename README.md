# GeoAnnotate

## Setting up to run locally

### Windows

(1) Go to Control Panel > Programs > Turn Windows Features On or Off

(2) Check the box labeled "Internet Information Services"

(3) Download the GeoAnnotate zip file (https://github.com/utcompling/GeoAnnotate/archive/master.zip)

(4) Decompress the folder and put it on the C drive (C:\GeoAnnotate-master)

(5) find the "cmd" application and right click > run as Administrator

(6) Navigate to where localhost is served on your machine. On my windows machine that was accomplished by 'cd C:\inetpub\wwwroot'

(8) Symbolic link the localhost directory and the folder that was unzipped to the C drive. 'mklink /d "C:\inetpub\wwwroot\GeoAnnotate-master" "C:\GeoAnnotate-master"

(9) Open Chrome and type /localhost/GeoAnnotate-master/MapEditor/toponym-annotate.html in the url bar

You should now see the application.




