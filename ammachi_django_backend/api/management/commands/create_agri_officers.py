from django.core.management.base import BaseCommand
from api.models import AgriculturalOfficer


class Command(BaseCommand):
    help = 'Create demo agricultural officers for different districts'

    def handle(self, *args, **options):
        self.stdout.write('Creating agricultural officers...')
        
        officers_data = [
            {
                'name': 'Dr. Rajesh Kumar',
                'designation': 'Senior Agricultural Officer',
                'district': 'Ernakulam',
                'phone': '+91 9876543210',
                'email': 'rajesh.kumar@agri.kerala.gov.in',
                'specialization': 'Coconut Cultivation, Pest Management',
                'experience_years': 15,
                'office_address': 'District Collectorate, Ernakulam',
                'available_hours': '9:00 AM - 5:00 PM',
                'languages': 'English, Malayalam, Hindi',
                'rating': 4.8,
                'consultation_fee': 0,
                'is_available': True
            },
            {
                'name': 'Dr. Priya Nair',
                'designation': 'Agricultural Extension Officer',
                'district': 'Thiruvananthapuram',
                'phone': '+91 9876543211',
                'email': 'priya.nair@agri.kerala.gov.in',
                'specialization': 'Organic Farming, Soil Health Management',
                'experience_years': 12,
                'office_address': 'Krishi Bhavan, Thiruvananthapuram',
                'available_hours': '9:00 AM - 4:30 PM',
                'languages': 'English, Malayalam',
                'rating': 4.9,
                'consultation_fee': 0,
                'is_available': True
            },
            {
                'name': 'Mr. Suresh Menon',
                'designation': 'Horticulture Officer',
                'district': 'Kottayam',
                'phone': '+91 9876543212',
                'email': 'suresh.menon@agri.kerala.gov.in',
                'specialization': 'Spice Cultivation, Pepper & Cardamom',
                'experience_years': 18,
                'office_address': 'Spice Board Office, Kottayam',
                'available_hours': '9:30 AM - 5:30 PM',
                'languages': 'English, Malayalam, Tamil',
                'rating': 4.7,
                'consultation_fee': 0,
                'is_available': True
            },
            {
                'name': 'Dr. Lakshmi Devi',
                'designation': 'Plant Protection Officer',
                'district': 'Thrissur',
                'phone': '+91 9876543213',
                'email': 'lakshmi.devi@agri.kerala.gov.in',
                'specialization': 'Disease Management, Integrated Pest Management',
                'experience_years': 20,
                'office_address': 'Agricultural Research Station, Thrissur',
                'available_hours': '8:30 AM - 4:30 PM',
                'languages': 'English, Malayalam',
                'rating': 4.9,
                'consultation_fee': 0,
                'is_available': True
            },
            {
                'name': 'Mr. Anil Varghese',
                'designation': 'Agricultural Officer',
                'district': 'Palakkad',
                'phone': '+91 9876543214',
                'email': 'anil.varghese@agri.kerala.gov.in',
                'specialization': 'Rice Cultivation, Water Management',
                'experience_years': 14,
                'office_address': 'District Agriculture Office, Palakkad',
                'available_hours': '9:00 AM - 5:00 PM',
                'languages': 'English, Malayalam, Tamil',
                'rating': 4.6,
                'consultation_fee': 0,
                'is_available': True
            },
            {
                'name': 'Dr. Maya Krishnan',
                'designation': 'Senior Horticulture Officer',
                'district': 'Kozhikode',
                'phone': '+91 9876543215',
                'email': 'maya.krishnan@agri.kerala.gov.in',
                'specialization': 'Fruit Cultivation, Post-Harvest Technology',
                'experience_years': 16,
                'office_address': 'Horticulture Department, Kozhikode',
                'available_hours': '9:00 AM - 4:00 PM',
                'languages': 'English, Malayalam',
                'rating': 4.8,
                'consultation_fee': 0,
                'is_available': True
            }
        ]
        
        for data in officers_data:
            officer, created = AgriculturalOfficer.objects.get_or_create(
                email=data['email'],
                defaults=data
            )
            if created:
                self.stdout.write(f'Created officer: {data["name"]} - {data["district"]}')
            else:
                self.stdout.write(f'Officer already exists: {data["name"]}')
        
        self.stdout.write(self.style.SUCCESS('Successfully created agricultural officers!'))
