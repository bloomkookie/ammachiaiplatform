from rest_framework import serializers
from .models import Farmer, Farm, Activity, Reminder, CropCalendar, KnowledgeBase, AgriculturalOfficer, Consultation


class FarmerSerializer(serializers.ModelSerializer):
    farms_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Farmer
        fields = '__all__'
        
    def get_farms_count(self, obj):
        return obj.farms.count()


class FarmSerializer(serializers.ModelSerializer):
    crops_list = serializers.SerializerMethodField()
    farmer_name = serializers.CharField(source='farmer.name', read_only=True)
    
    class Meta:
        model = Farm
        fields = '__all__'
        
    def get_crops_list(self, obj):
        return obj.get_crops_list()


class ActivitySerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.name', read_only=True)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    
    class Meta:
        model = Activity
        fields = '__all__'


class ReminderSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.name', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Reminder
        fields = '__all__'
        
    def get_is_overdue(self, obj):
        from django.utils import timezone
        return obj.due_date < timezone.now() and not obj.is_completed


class CropCalendarSerializer(serializers.ModelSerializer):
    pests_list = serializers.SerializerMethodField()
    
    class Meta:
        model = CropCalendar
        fields = '__all__'
        
    def get_pests_list(self, obj):
        return obj.get_common_pests_list()


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    crops_list = serializers.SerializerMethodField()
    regions_list = serializers.SerializerMethodField()
    
    class Meta:
        model = KnowledgeBase
        fields = '__all__'
        
    def get_crops_list(self, obj):
        return obj.get_applicable_crops_list()
        
    def get_regions_list(self, obj):
        return obj.get_applicable_regions_list()


# Specialized serializers for specific use cases
class FarmerSummarySerializer(serializers.ModelSerializer):
    """Lightweight farmer info for dropdowns/lists"""
    class Meta:
        model = Farmer
        fields = ['id', 'name', 'phone', 'district']


class FarmSummarySerializer(serializers.ModelSerializer):
    """Lightweight farm info for dropdowns/lists"""
    class Meta:
        model = Farm
        fields = ['id', 'name', 'land_size_acres', 'primary_crops']


class ActivityCreateSerializer(serializers.ModelSerializer):
    """Specialized serializer for creating activities with text parsing"""
    
    class Meta:
        model = Activity
        fields = ['farmer', 'farm', 'text_note', 'date']
        
    def create(self, validated_data):
        # Simple text parsing logic
        text = validated_data['text_note'].lower()
        
        # Determine activity type from text
        activity_type = 'other'  # default
        amount = None
        input_type = ''
        
        if any(word in text for word in ['irrigat', 'water']):
            activity_type = 'irrigation'
        elif any(word in text for word in ['sow', 'plant', 'seed']):
            activity_type = 'sowing'
        elif any(word in text for word in ['fertiliz', 'manure', 'compost']):
            activity_type = 'fertilizer'
        elif any(word in text for word in ['spray', 'pesticide', 'insecticide']):
            activity_type = 'pesticide'
        elif any(word in text for word in ['weed', 'grass']):
            activity_type = 'weeding'
        elif any(word in text for word in ['harvest', 'pick', 'collect']):
            activity_type = 'harvesting'
        elif any(word in text for word in ['pest', 'insect', 'bug']):
            activity_type = 'pest_issue'
        elif any(word in text for word in ['disease', 'fungus', 'rot']):
            activity_type = 'disease_issue'
            
        # Extract amount if mentioned
        import re
        amount_match = re.search(r'(\d+(?:\.\d+)?)\s*(acre|kg|liter|bag)', text)
        if amount_match:
            amount = float(amount_match.group(1))
            
        validated_data['activity_type'] = activity_type
        validated_data['amount'] = amount
        validated_data['input_type'] = input_type
        
        return super().create(validated_data)


class AgriculturalOfficerSerializer(serializers.ModelSerializer):
    languages_list = serializers.SerializerMethodField()
    consultation_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AgriculturalOfficer
        fields = '__all__'
        
    def get_languages_list(self, obj):
        return obj.get_languages_list()
        
    def get_consultation_count(self, obj):
        return obj.consultations.count()


class ConsultationSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.name', read_only=True)
    officer_name = serializers.CharField(source='officer.name', read_only=True)
    officer_designation = serializers.CharField(source='officer.designation', read_only=True)
    
    class Meta:
        model = Consultation
        fields = '__all__'


class ConsultationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consultation
        fields = ['farmer', 'officer', 'subject', 'description', 'preferred_date', 
                 'farmer_phone', 'farmer_location', 'consultation_type']
