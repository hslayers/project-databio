#!/bin/sh
msgcat -f translatables.txt -o merged.po
sed -i 's/#-#-#-#-#  cs_CZ.po  #-#-#-#-#\\n//g' merged.po
sed -i 's/, fuzzy/was fuzzy/g' merged.po
grunt nggettext_compile