#Make Annotation Files
import os



docgeo_directory = "/Users/grant/devel/GeoAnnotate/docgeo_spans_dloaded_103115"
toponym_directory = "/Users/grant/devel/GeoAnnotate/toponym_annotated_103115"

for f in os.listdir(docgeo_directory):
	fp = os.path.join(docgeo_directory, f)
	vol = fp.split('-')[1].split('.')[0]

vol_stop_strings = {'61':"The detachment from Army of the Tennessee re-embarks for Vicksburg, Miss.",
					'77':"On taking command, by the request of my superior officer, Colonel F. Campbell, by direction of Colonel McMillen",
					'78':"I suggest that rations be sent to Colonel Wolfe's brigade, and that they",
					'79': "Two prisoners brought in on train, captured near Midway.",
					}

for f in os.listdir(toponym_directory):
	fp = os.path.join(toponym_directory, f)
	vol = fp.split('-')[1].split('.')[0]
