from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import json


class Farmer(models.Model):
    """Farmer profile with basic information"""
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True, null=True)
    district = models.CharField(max_length=50)
    state = models.CharField(max_length=50, default='Kerala')
    preferred_language = models.CharField(
        max_length=20, 
        choices=[('English', 'English'), ('Malayalam', 'Malayalam')],
        default='English'
    )
    experience_years = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.district})"

    class Meta:
        ordering = ['-created_at']


class Farm(models.Model):
    """Individual farm belonging to a farmer"""
    SOIL_TYPES = [
        ('clay', 'Clay'),
        ('sandy', 'Sandy'),
        ('loamy', 'Loamy'),
        ('black', 'Black Soil'),
        ('red', 'Red Soil'),
        ('alluvial', 'Alluvial'),
        ('laterite', 'Laterite'),
    ]
    
    IRRIGATION_TYPES = [
        ('rain_fed', 'Rain Fed'),
        ('drip', 'Drip Irrigation'),
        ('sprinkler', 'Sprinkler'),
        ('flood', 'Flood Irrigation'),
        ('canal', 'Canal'),
        ('bore_well', 'Bore Well'),
        ('open_well', 'Open Well'),
    ]

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='farms')
    name = models.CharField(max_length=100)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    district = models.CharField(max_length=50)
    state = models.CharField(max_length=50, default='Kerala')
    land_size_acres = models.FloatField()
    soil_type = models.CharField(max_length=20, choices=SOIL_TYPES)
    irrigation_type = models.CharField(max_length=20, choices=IRRIGATION_TYPES)
    primary_crops = models.TextField(help_text="Comma-separated list of crops")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_crops_list(self):
        """Return crops as a list"""
        return [crop.strip() for crop in self.primary_crops.split(',') if crop.strip()]

    def __str__(self):
        return f"{self.name} - {self.farmer.name}"

    class Meta:
        ordering = ['-created_at']


class Activity(models.Model):
    """Farm activities logged by farmers"""
    ACTIVITY_TYPES = [
        ('sowing', 'Sowing'),
        ('irrigation', 'Irrigation'),
        ('fertilizer', 'Fertilizer Application'),
        ('pesticide', 'Pesticide Application'),
        ('weeding', 'Weeding'),
        ('harvesting', 'Harvesting'),
        ('pest_issue', 'Pest Issue'),
        ('disease_issue', 'Disease Issue'),
        ('other', 'Other'),
    ]

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='activities')
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    text_note = models.TextField()
    date = models.DateField(default=timezone.now)
    amount = models.FloatField(null=True, blank=True, help_text="Quantity/amount if applicable")
    input_type = models.CharField(max_length=100, blank=True, help_text="Type of input used (fertilizer name, etc.)")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.farmer.name} - {self.activity_type} on {self.date}"

    class Meta:
        ordering = ['-date', '-created_at']


class Reminder(models.Model):
    """Reminders and alerts for farmers"""
    REMINDER_CATEGORIES = [
        ('operation', 'Farm Operation'),
        ('scheme', 'Government Scheme'),
        ('price', 'Price Alert'),
        ('weather', 'Weather Alert'),
        ('pest', 'Pest/Disease Alert'),
        ('general', 'General'),
    ]

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='reminders')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    category = models.CharField(max_length=20, choices=REMINDER_CATEGORIES)
    is_completed = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.farmer.name}"

    class Meta:
        ordering = ['due_date', '-created_at']


class CropCalendar(models.Model):
    """Crop calendar data for different regions"""
    crop_name = models.CharField(max_length=50)
    district = models.CharField(max_length=50)
    state = models.CharField(max_length=50, default='Kerala')
    sowing_start_month = models.IntegerField()  # 1-12
    sowing_end_month = models.IntegerField()    # 1-12
    harvest_start_month = models.IntegerField() # 1-12
    harvest_end_month = models.IntegerField()   # 1-12
    best_practices = models.TextField(blank=True)
    common_pests = models.TextField(blank=True, help_text="JSON list of common pests")
    
    def get_common_pests_list(self):
        """Return pests as a list"""
        try:
            return json.loads(self.common_pests) if self.common_pests else []
        except:
            return []

    def __str__(self):
        return f"{self.crop_name} - {self.district}"

    class Meta:
        unique_together = ['crop_name', 'district', 'state']


class KnowledgeBase(models.Model):
    """Knowledge base for farming tips and best practices"""
    KNOWLEDGE_TYPES = [
        ('pest_control', 'Pest Control'),
        ('disease_management', 'Disease Management'),
        ('soil_management', 'Soil Management'),
        ('irrigation_tips', 'Irrigation Tips'),
        ('fertilizer_guide', 'Fertilizer Guide'),
        ('weather_advisory', 'Weather Advisory'),
    ]

    title = models.CharField(max_length=200)
    content = models.TextField()
    knowledge_type = models.CharField(max_length=20, choices=KNOWLEDGE_TYPES)
    applicable_crops = models.TextField(help_text="Comma-separated list of applicable crops")
    applicable_regions = models.TextField(help_text="Comma-separated list of applicable districts/states")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_applicable_crops_list(self):
        return [crop.strip() for crop in self.applicable_crops.split(',') if crop.strip()]

    def get_applicable_regions_list(self):
        return [region.strip() for region in self.applicable_regions.split(',') if region.strip()]

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']


class AgriculturalOfficer(models.Model):
    """Agricultural officers available for consultation"""
    name = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)
    district = models.CharField(max_length=50)
    state = models.CharField(max_length=50, default='Kerala')
    phone = models.CharField(max_length=15)
    email = models.EmailField(unique=True)
    specialization = models.TextField(help_text="Areas of expertise")
    experience_years = models.IntegerField()
    office_address = models.TextField()
    available_hours = models.CharField(max_length=50)
    languages = models.CharField(max_length=100, help_text="Comma-separated languages")
    rating = models.FloatField(default=0.0)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_available = models.BooleanField(default=True)
    profile_image = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_languages_list(self):
        return [lang.strip() for lang in self.languages.split(',') if lang.strip()]

    def __str__(self):
        return f"{self.name} - {self.designation} ({self.district})"

    class Meta:
        ordering = ['-rating', 'name']


class Consultation(models.Model):
    """Consultation requests between farmers and agricultural officers"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='consultations')
    officer = models.ForeignKey(AgriculturalOfficer, on_delete=models.CASCADE, related_name='consultations')
    subject = models.CharField(max_length=200)
    description = models.TextField()
    preferred_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    farmer_phone = models.CharField(max_length=15)
    farmer_location = models.CharField(max_length=100, blank=True)
    consultation_type = models.CharField(
        max_length=20,
        choices=[
            ('phone', 'Phone Call'),
            ('video', 'Video Call'),
            ('visit', 'Farm Visit'),
            ('office', 'Office Visit'),
        ],
        default='phone'
    )
    notes = models.TextField(blank=True, help_text="Officer's notes after consultation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.farmer.name} -> {self.officer.name} ({self.status})"

    class Meta:
        ordering = ['-created_at']
