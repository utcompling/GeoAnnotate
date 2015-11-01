#Make Annotation Files
import os


voltext_directory = "/Users/grant/devel/GeoAnnotate/volume_text"
docgeo_directory = "/Users/grant/devel/GeoAnnotate/docgeo_spans_dloaded_103115"
toponym_directory = "/Users/grant/devel/GeoAnnotate/toponym_annotated_103115"

voltext_dict = {}

for f in os.listdir(voltext_directory):
	fp = os.path.join(voltext_directory, f)
	vol = str(int(fp.split('.')[0]))
	with open(fp, 'rb') as r:
		voltext_dict[vol] = r.read()

docgeo_dict = {}

for f in os.listdir(docgeo_directory):
	fp = os.path.join(docgeo_directory, f)
	annotator = fp.split('-')[0]
	vol = fp.split('-')[1].split('.')[0]
	if vol not in docgeo_dict:
		docgeo_dict[vol] = {}
	with open(fp, 'rb') as r:
		for doc in r.read().split('|'):
			row = doc.split('$')
			char_start = row[1]
			char_end = row[2]
			geo = row[3]
			docgeo_dict[vol][char_start+'-'+char_end] = {geo, annotator, text} 

vol_stop_strings = {'61':"The detachment from Army of the Tennessee re-embarks for Vicksburg, Miss.",
					'77':"On taking command, by the request of my superior officer, Colonel F. Campbell, by direction of Colonel McMillen",
					'78':"I suggest that rations be sent to Colonel Wolfe's brigade, and that they",
					'79': "Two prisoners brought in on train, captured near Midway.",
					}

for f in os.listdir(toponym_directory):
	fp = os.path.join(toponym_directory, f)
	vol = fp.split('-')[1].split('.')[0]
