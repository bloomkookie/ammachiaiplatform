from django.core.management.base import BaseCommand
from api.models import CropCalendar, KnowledgeBase
import json


class Command(BaseCommand):
    help = 'Populate initial data for crop calendar and knowledge base'

    def handle(self, *args, **options):
        self.stdout.write('Populating crop calendar data...')
        
        # Kerala crop calendar data
        crop_data = [
            {
                'crop_name': 'Rice',
                'district': 'Ernakulam',
                'sowing_start_month': 6,
                'sowing_end_month': 7,
                'harvest_start_month': 10,
                'harvest_end_month': 11,
                'best_practices': 'Ensure proper water management. Use certified seeds. Apply organic manure.',
                'common_pests': json.dumps(['Brown Plant Hopper', 'Stem Borer', 'Leaf Folder'])
            },
            {
                'crop_name': 'Coconut',
                'district': 'Ernakulam',
                'sowing_start_month': 1,
                'sowing_end_month': 12,
                'harvest_start_month': 1,
                'harvest_end_month': 12,
                'best_practices': 'Regular irrigation during dry season. Apply coconut husk and organic matter.',
                'common_pests': json.dumps(['Red Palm Weevil', 'Rhinoceros Beetle', 'Coconut Mite'])
            },
            {
                'crop_name': 'Pepper',
                'district': 'Ernakulam',
                'sowing_start_month': 5,
                'sowing_end_month': 6,
                'harvest_start_month': 12,
                'harvest_end_month': 2,
                'best_practices': 'Provide proper support structures. Ensure good drainage. Regular pruning.',
                'common_pests': json.dumps(['Pepper Weevil', 'Scale Insects', 'Nematodes'])
            },
            {
                'crop_name': 'Cardamom',
                'district': 'Idukki',
                'sowing_start_month': 6,
                'sowing_end_month': 7,
                'harvest_start_month': 10,
                'harvest_end_month': 12,
                'best_practices': 'Shade management is crucial. Maintain 50-60% shade. Regular weeding.',
                'common_pests': json.dumps(['Cardamom Thrips', 'Root Grub', 'Shoot Fly'])
            }
        ]
        
        for data in crop_data:
            calendar, created = CropCalendar.objects.get_or_create(
                crop_name=data['crop_name'],
                district=data['district'],
                defaults=data
            )
            if created:
                self.stdout.write(f'Created calendar for {data["crop_name"]} in {data["district"]}')
        
        self.stdout.write('Populating knowledge base...')
        
        # Knowledge base entries
        knowledge_data = [
            {
                'title': 'Organic Pest Control for Rice',
                'content': 'Use neem oil spray (5ml per liter) during evening hours. Install pheromone traps. Encourage natural predators like spiders and dragonflies.',
                'knowledge_type': 'pest_control',
                'applicable_crops': 'Rice',
                'applicable_regions': 'Kerala, Tamil Nadu'
            },
            {
                'title': 'Coconut Red Palm Weevil Management',
                'content': 'Regular inspection of palms. Use pheromone traps. Apply neem cake around the base. Remove and destroy affected parts immediately.',
                'knowledge_type': 'pest_control',
                'applicable_crops': 'Coconut',
                'applicable_regions': 'Kerala, Karnataka, Tamil Nadu'
            },
            {
                'title': 'Pepper Irrigation Best Practices',
                'content': 'Drip irrigation is most effective. Water early morning or evening. Avoid waterlogging. Mulching helps retain moisture.',
                'knowledge_type': 'irrigation_tips',
                'applicable_crops': 'Pepper',
                'applicable_regions': 'Kerala, Karnataka'
            },
            {
                'title': 'Monsoon Preparation for All Crops',
                'content': 'Ensure proper drainage. Stake tall plants. Apply preventive fungicide spray. Harvest mature crops before heavy rains.',
                'knowledge_type': 'weather_advisory',
                'applicable_crops': 'Rice, Coconut, Pepper, Cardamom',
                'applicable_regions': 'Kerala'
            },
            {
                'title': 'Soil Health Management',
                'content': 'Regular soil testing every 2-3 years. Add organic matter like compost. Maintain proper pH levels. Practice crop rotation.',
                'knowledge_type': 'soil_management',
                'applicable_crops': 'Rice, Pepper, Cardamom',
                'applicable_regions': 'Kerala, Tamil Nadu, Karnataka'
            }
        ]
        
        for data in knowledge_data:
            knowledge, created = KnowledgeBase.objects.get_or_create(
                title=data['title'],
                defaults=data
            )
            if created:
                self.stdout.write(f'Created knowledge: {data["title"]}')
        
        self.stdout.write(self.style.SUCCESS('Successfully populated initial data!'))
