#Make Annotation Files
import os


voltext_directory = "/Users/grant/devel/GeoAnnotate/volume_text"
docgeo_directory = "/Users/grant/devel/GeoAnnotate/docgeo_spans_dloaded_103115"
toponym_directory = "/Users/grant/devel/GeoAnnotate/toponym_annotated_103115"

voltext_dict = {}

for f in os.listdir(voltext_directory):
	fp = os.path.join(voltext_directory, f)
	vol = str(int(f.split('.')[0]))
	with open(fp, 'rb') as r:
		voltext_dict[vol] = r.read()

docgeo_dict = {}

for f in os.listdir(docgeo_directory):
	fp = os.path.join(docgeo_directory, f)
	annotator = f.split('-')[0]
	vol = fp.split('-')[1].split('.')[0]
	if vol not in docgeo_dict:
		docgeo_dict[vol] = {}
	with open(fp, 'rb') as r:
		for doc in r.read().split('|'):
			row = doc.split('$')
			char_start = row[1]
			char_end = row[2]
			geo = row[3]
			docgeo_dict[vol][char_start+'-'+char_end] = {'geo':geo, 'annotator':annotator, 'text':voltext_dict[vol][int(char_start):int(char_end)]}
			#print docgeo_dict[vol][char_start+'-'+char_end]

vol_stop_strings = {'61':"The detachment from Army of the Tennessee re-embarks for Vicksburg, Miss.",
					'77':"On taking command, by the request of my superior officer, Colonel F. Campbell, by direction of Colonel McMillen",
					'78':"I suggest that rations be sent to Colonel Wolfe's brigade, and that they",
					'79': "Two prisoners brought in on train, captured near Midway."
					}

topo_dict = {}

def check_in_doc(docgeo_dict, vol, start_char, end_char):
	for doc in docgeo_dict[vol]:
		if int(start_char) <= int(doc.split('-')[1]) and int(start_char) >= int(doc.split('-')[0]) and int(end_char) <= int(doc.split('-')[1]):
			return doc
	return False


for f in os.listdir(toponym_directory):
	fp = os.path.join(toponym_directory, f)
	vol = f.split('-')[1].split('.')[0]
	topo_dict[vol] = {}
	with open(fp, 'rb') as r:
		for line in r.read().split('|'):
			row = line.split('$')
			ne_type = row[0]
			char_start = row[1]
			char_end = row[2]
			geo = row[3]
			if vol in vol_stop_strings:
				if voltext_dict[vol].find(vol_stop_strings[vol]) > int(char_start):
					cd = check_in_doc(docgeo_dict, vol, char_start, char_end)
					if cd != False:
						if cd not in topo_dict[vol]:
							topo_dict[vol][cd] = [{'geo':geo, 'char_start':char_start, 'char_end':char_end, 'toponym':voltext_dict[vol][int(char_start):int(char_end)], 'entity_type':ne_type}]
						else:
							topo_dict[vol][cd].append({'geo':geo, 'char_start':char_start, 'char_end':char_end, 'toponym':voltext_dict[vol][int(char_start):int(char_end)], 'entity_type':ne_type})
	
			else:
				cd = check_in_doc(docgeo_dict, vol, char_start, char_end)
				if cd != False:
					if cd not in topo_dict[vol]:
							topo_dict[vol][cd] = [{'geo':geo, 'char_start':char_start, 'char_end':char_end, 'toponym':voltext_dict[vol][int(char_start):int(char_end)], 'entity_type':ne_type}]
					else:
						topo_dict[vol][cd].append({'geo':geo, 'char_start':char_start, 'char_end':char_end, 'toponym':voltext_dict[vol][int(char_start):int(char_end)], 'entity_type':ne_type})

for vol in topo_dict:
	for cd in topo_dict[vol]:
		print topo_dict[vol][cd]
