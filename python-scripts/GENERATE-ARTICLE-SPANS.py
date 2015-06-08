To generate article spans:

(NOTE: Use search/replace to replace the date everywhere in this file as appropriate)

First, you need the following:

1. Text of pages 100-199 of all volumes of War of the Rebellion (WOTR), e.g. in
   '../wotr-text-100'. This should contain only the '*.txt.joined' files
   (use symlinks if necessary).
2. Text of all pages of all volumes of War of the Rebellion, e.g. in
   '../wotr-text'. This should contain only the '*.txt.joined' files
   (use symlinks if necessary).
3. Files containing docgeo spans, e.g. in 'docgeo-spans-may-18-715pm'.

This generates the following result directory:

1. 'wotr-spans.may-18-715pm' or similar, containing the text of WOTR with
    the spans marked.

It also generates the following intermediate files/directories:

1. 'articleseg_feats.txt.may-18-715pm': Features for training the Mallet
   sequence model to predict the spans.
2. 'mallet.model.may-18-715pm': Mallet sequence model predicted from the
   above file.
3. 'mallet-predict.may-18-715pm': Directory containing features for predicting
   the spans of the WOTR text, one file per volume.
4. 'mallet-predictions.may-18-715pm': Directory containing Mallet predictions
   (in B/I/O/L format for beginning/inside/outside/last) of the above
   feature files.

Then:

1. Generate Mallet training data.

generate-span-features --spans docgeo-spans-may-18-715pm --text ../wotr-text-100 --training-file articleseg_feats.txt.may-18-715pm --train

This generates a file 'articleseg_feats.txt.may-18-715pm' containing Mallet
training data.

2. Train Mallet.

java -cp /Users/benwing/devel/mallet-2.0.7/class:/Users/benwing/devel/mallet-2.0.7/lib/mallet-deps.jar cc.mallet.fst.SimpleTagger --train true --model-file mallet.model.may-18-715pm articleseg_feats.txt.may-18-715pm

This uses 'articleseg_feats.txt.may-18-715pm' to train a model, stored in
'mallet.model.may-18-715pm'.

3. Generate features for the full War of the Rebellion text (this may
   take awhile).

generate-span-features --text ../wotr-text --predict-dir mallet-predict.may-18-715pm --predict

4. Run Mallet in prediction mode.

md mallet-predictions.may-18-715pm
cd mallet-predict.may-18-715pm
for x in *.feats; do echo $x; java -cp /Users/benwing/devel/mallet-2.0.7/class:/Users/benwing/devel/mallet-2.0.7/lib/mallet-deps.jar cc.mallet.fst.SimpleTagger --model-file ../mallet.model.may-18-715pm $x >! ../mallet-predictions.may-18-715pm/`basename $x .feats`.predictions; done
cd ..

5. Combine the predictions and text to generate predicted spans.

generate-span-features --text ../wotr-text --predictions mallet-predictions.may-18-715pm --predicted-spans-dir wotr-spans.may-18-715pm --predicted-spans
