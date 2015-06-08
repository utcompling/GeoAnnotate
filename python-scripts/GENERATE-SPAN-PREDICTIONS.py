To generate span predictions:

First, you need the following:

1. Text of pages 100-200 of all volumes of War of the Rebellion (WOTR), e.g. in
   '../wotr-text-100'. This should contain only the '*.txt.joined' files
   (use symlinks if necessary).
2. Files containing manually annotated docgeo spans, e.g. in
   'docgeo-spans-may-18-715pm'.
3. Files containing predicted spans, including the text, e.g. in
   'wotr-spans.may-18-715pm'.

The steps below produce the following output files/directories:

1. 'wotr-may-18-715pm-100-0-0' or similar: Directory containing the manually
   annotated docgeo spans in TextDB format, split with 100% in the training
   set.
2. 'wotr-may-18-715pm-60-20-20' or similar: Directory containing the manually
   annotated docgeo spans in TextDB format, split 60/20/20 in
   training/dev/test.
3. 'volspans-predicted-wotr-may-18-715pm' or similar: Directory containing
   the predicted WOTR spans in TextDB format.
4. 'volspans-predicted-wotr-may-18-715pm-predicted-deg1' or similar (and
   likewise for '...-deg1.5', '...-deg2', '...-deg2.5', '...-deg3.5'):
   Directory containing the predicted WOTR spans in TextDB format, with
   predicted coordinates at various grid sizes using Naive Bayes.

Then:

1. Generate the manually annotated docgeo spans in TextDB format, both
   60/20/20 split and 100/0/0 split.

~tgpy/wotr_to_corpus.py --spans docgeo-spans-may-18-715pm --text ../wotr-text-100 -o ~co/wotr/wotr-may-18-715pm-60-20-20/wotr-may-18-715pm-60-20-20 --fractions 60:20:20
~tgpy/wotr_to_corpus.py --spans docgeo-spans-may-18-715pm --text ../wotr-text-100 -o ~co/wotr/wotr-may-18-715pm-100-0-0/wotr-may-18-715pm-100-0-0 --fractions 100:0:0

2. Generate the predicted WOTR spans in TextDB format, 0/100/0 split (this
   puts everything in the dev set so that we can geolocate it), with the
   manually annotated docgeo spans as training data.

~tgpy/wotr_to_corpus.py --predicted-spans wotr-spans.may-18-715pm -o ~co/wotr/volspans-predicted-wotr-may-18-715pm/volspans-predicted --include-non-coord-paras --fractions 0:100:0
cp ~co/wotr/wotr-may-18-715pm-100-0-0/*-training.* ~co/wotr/volspans-predicted-wotr-may-18-715pm
rm ~co/wotr/volspans-predicted-wotr-may-18-715pm/volspans-predicted-{training,test}*
bzip2 ~co/wotr/volspans-predicted-wotr-may-18-715pm/volspans-predicted-dev.data.txt

3. Geolocate the predicted WOTR spans.

To do this locally:

mkdir ~tge/wotr/volspans-predicted-wotr-may-18-715pm
cd ~tge/wotr/volspans-predicted-wotr-may-18-715pm
for x in 1 1.5 2 2.5 3.5; do nohup-tg-geolocate wotr/volspans-predicted-wotr-may-18-715pm --ranker nb --dpc $x; done

To do this on Maverick:

rsync -avz ~co/wotr/volspans-predicted-wotr-may-18-715pm maverick:/work/01683/benwing/corpora/wotr
ssh maverick
mkdir ~tge/wotr/volspans-predicted-wotr-may-18-715pm
cd ~tge/wotr/volspans-predicted-wotr-may-18-715pm
Then create a file job.gpu.24hr.volspans-predicted-wotr-may-18-15pm.nb as follows:
---------------------------- cut -------------------------------
#!/bin/bash
#
#SBATCH -J benwing1                   # Job name
#SBATCH -o benwing-%j.out             # Name of stdout output file (%j expands to jobId)
#SBATCH -p gpu                        # Queue name
#SBATCH -N 1                          # Total number of nodes requested (20 cores/node)
#SBATCH -n 20                         # Total number of mpi tasks requested
#SBATCH -t 24:00:00                   # Run time (hh:mm:ss) - 24 hours

# Run Naive Bayes or other simple ranking method (including possible
# IGR filtering) on combined WOTR May 18 715pm in-domain as training data,
# full WOTR as dev data. See the file '$WORK/exps/jobscripts/job.corpus.nb'
# for more documentation.

corpusdir=wotr
corpus=volspans-predicted-wotr-may-18-715pm
igrdir=$WORK/exps/$corpusdir/$corpus/igr

jobscripts=$WORK/exps/jobscripts
. $jobscripts/job.corpus.nb

# vi:filetype=sh
---------------------------- cut -------------------------------
sbatch job.gpu.24hr.volspans-predicted-wotr-may-18-715pm.nb uniform "1 1.5 2 2.5 3.5"
Then wait for it to finish (in 20 minutes or so).
exit
mkdir ~tge/wotr/volspans-predicted-wotr-may-18-715pm
cd ~tge/wotr/volspans-predicted-wotr-may-18-715pm
rsync -avz maverick:/work/01683/benwing/exps/wotr/volspans-predicted-wotr-may-18-715pm/\* .

4. Then combine the geolocated results back into the predicted spans.

cd ~tge/wotr/volspans-predicted-wotr-may-18-715pm
for x in 1 1.50 2 2.50 3.50; do textgrounder run opennlp.textgrounder.preprocess.FrobTextDB --coords-from-results results.volspans-predicted-wotr-may-18-715pm.nbayes.deg$x.2015*.data.txt -i ~cowr/volspans-predicted-wotr-may-18-715pm -s dev --output-dir ~cowr/volspans-predicted-wotr-may-18-715pm-predicted-deg$x &; done
for x in 1 1.50 2 2.50 3.50; do bzip2 ~cowr/volspans-predicted-wotr-may-18-715pm-predicted-deg$x/*.data.txt &; done

5. Finally, move the dev data to become training data so that further work
   can be done on it (e.g. creating KML graphs or heatmaps).

for x in 1 1.50 2 2.50 3.50; do cd volspans-predicted-wotr-may-18-715pm-predicted-deg$x; mmv *-dev.* *-training.*; gr dev training *.schema.txt; cd ..; done
