#Make Annotation Files
import os
import json

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
	i = 1
	with open(fp, 'rb') as r:
		for doc in r.read().split('|'):
			row = doc.split('$')
			char_start = row[1]
			char_end = row[2]
			geo = row[3]
			docgeo_dict[vol][char_start+'-'+char_end] = {'docid':i, 'doc_charstart':int(char_start), 'doc_charend':int(char_end), 'vol':vol, 'geo':geo, 'annotator':annotator, 'text':voltext_dict[vol][int(char_start):int(char_end)]}
			i += 1
			#print docgeo_dict[vol][char_start+'-'+char_end]

vol_stop_strings = {'61':"The detachment from Army of the Tennessee re-embarks for Vicksburg, Miss.",
					'75':"for I have a very high personal esteem for General Hovey, and believe he is unquestionably a most gallant soldier"
					'76':"done they will be arrested in the same manner and banished from the United States as these men",
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
							topo_dict[vol][cd] = {'text':docgeo_dict[vol][cd]['text'], 'docid':docgeo_dict[vol][cd]['docid'], 'toponyms':[{'geo':geo, 'char_start':int(char_start)-docgeo_dict[vol][cd]['doc_charstart'],
																 'char_end':int(char_end)-docgeo_dict[vol][cd]['doc_charstart'], 'entity_string':voltext_dict[vol][int(char_start):int(char_end)], 'entity_type':ne_type}]}
						else:
							topo_dict[vol][cd]['toponyms'].append({'geo':geo, 'char_start':int(char_start)-docgeo_dict[vol][cd]['doc_charstart'],
																 'char_end':int(char_end)-docgeo_dict[vol][cd]['doc_charstart'], 'entity_string':voltext_dict[vol][int(char_start):int(char_end)], 'entity_type':ne_type})
	
			else:
				cd = check_in_doc(docgeo_dict, vol, char_start, char_end)
				if cd != False:
					if cd not in topo_dict[vol]:
							topo_dict[vol][cd] = {'vol':vol, 'docid':docgeo_dict[vol][cd]['docid'], 'text':docgeo_dict[vol][cd]['text'], 'toponyms':[{'geo':geo, 'char_start':int(char_start)-docgeo_dict[vol][cd]['doc_charstart'],
																 'char_end':int(char_end)-docgeo_dict[vol][cd]['doc_charstart'], 'entity_string':voltext_dict[vol][int(char_start):int(char_end)], 'entity_type':ne_type}]}
					else:
						topo_dict[vol][cd]['toponyms'].append({'geo':geo, 'char_start':int(char_start)-docgeo_dict[vol][cd]['doc_charstart'],
																 'char_end':int(char_end)-docgeo_dict[vol][cd]['doc_charstart'], 'entity_string':voltext_dict[vol][int(char_start):int(char_end)], 'entity_type':ne_type})

for vol in topo_dict:
	for cd in topo_dict[vol]:
		file_name = 'vol'+vol+'_'+cd+'.json'
		with open(file_name, 'wb') as w:
			json.dump(topo_dict[vol][cd], w, indent=5)

