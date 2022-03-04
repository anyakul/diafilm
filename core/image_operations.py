from wagtail.images.image_operations import FilterOperation


class GrayscaleOperation(FilterOperation):
    def construct(self):
        pass

    def run(self, willow, image, env):
        willow.image = willow.image.convert('LA')
        return willow
