import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch
import growth_pages

class VerifiedContent(unittest.TestCase):
 def config(self):return {'member_count':None,'member_count_source':'','testimonials':[],'family':{'status':'planned'}}
 def test_empty_unconfirmed_stories_are_not_replaced_with_examples(self):
  with patch.object(growth_pages,'CONFIG',self.config()):self.assertEqual(growth_pages.validated_stories(),[])
 def test_publication_requires_real_photo_source_and_approval(self):
  image='assets/images/Bea-e1602021371986-43311a4004-1000.webp'
  story={'name':'QA Person','age':40,'goal':'QA goal','quote':'QA statement','image':image,'source':'QA fixture only','approved_for_publication':True}
  for changed in [{'source':''},{'approved_for_publication':False},{'image':'../../README.md'},{'age':True},{'quote':' '}]:
   config=self.config();config['testimonials']=[{**story,**changed}]
   with patch.object(growth_pages,'CONFIG',config),self.assertRaises(ValueError):growth_pages.validated_stories()
  config=self.config();config['testimonials']=[story]
  with patch.object(growth_pages,'CONFIG',config):self.assertEqual(len(growth_pages.validated_stories()),1)
 def test_member_count_requires_a_source_and_positive_integer(self):
  for count,source in [(2000,''),(2000,' '),(True,'QA'),(-1,'QA')]:
   config=self.config();config.update(member_count=count,member_count_source=source)
   with patch.object(growth_pages,'CONFIG',config),self.assertRaises(ValueError):growth_pages.validated_stories()
 def test_changing_status_alone_cannot_activate_a_family_offer(self):
  config=self.config();config['family']['status']='active'
  with patch.object(growth_pages,'CONFIG',config),self.assertRaises(ValueError):growth_pages.validated_stories()

if __name__=='__main__':unittest.main()
