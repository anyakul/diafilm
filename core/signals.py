from django.db import transaction
from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver

from core.models import Diafilm, DiafilmPerson, Person


@receiver(post_save, sender=Diafilm)
def handle_persons(instance, *args, **kwargs):
    person_list = instance.doc and instance.doc.get("persons") or []
    for data in person_list:
        person, is_created = Person.objects.get_or_create(
            full_name=data["name"],
            defaults={},
        )

        DiafilmPerson.objects.get_or_create(
            person=person,
            diafilm=instance,
            role=data["role"],
            defaults={},
        )


@receiver(m2m_changed, sender=Diafilm)
def update_elasticsearch_doc(instance, **kwargs):
    print("signal", instance)
    # transaction.on_commit(lambda: instance.doc_update())


@receiver(post_save, sender=DiafilmPerson)
def update_es_doc(instance, **kwargs):
    """
    При изменении персоны тоже обновляем дифаильм в эластике
    """
    print("signal", instance)
    # transaction.on_commit(lambda: instance.diafilm.elasticsearch_update())


@receiver(post_save, sender=Diafilm)
def sync_elasticsearch_doc(instance, created, **kwargs):
    """
    При сохранении диафильма и некоторых других сущностей
    Мы генерим новый документ для эластика
    И после сохранения он доступен в поле doc
    Тут нам надо синхронизировать его в эластик
    """
    print("signal", instance, created)
    # transaction.on_commit(lambda: instance.elasticsearch_sync())
