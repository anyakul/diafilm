import re

from django import template
from django.template.base import FilterExpression, kwarg_re

register = template.Library()


def parse_tag(token, parser):
    """
    Generic template tag parser.

    Returns a three-tuple: (tag_name, args, kwargs)

    tag_name is a string, the name of the tag.

    args is a list of FilterExpressions, from all the arguments that didn't look like kwargs,
    in the order they occurred, including any that were mingled amongst kwargs.

    kwargs is a dictionary mapping kwarg names to FilterExpressions, for all the arguments that
    looked like kwargs, including any that were mingled amongst args.

    (At rendering time, a FilterExpression f can be evaluated by calling f.resolve(context).)
    """
    # Split the tag content into words, respecting quoted strings.
    bits = token.split_contents()

    # Pull out the tag name.
    tag_name = bits.pop(0)

    # Parse the rest of the args, and build FilterExpressions from them so that
    # we can evaluate them later.
    args = []
    kwargs = {}
    for bit in bits:
        # Is this a kwarg or an arg?
        match = kwarg_re.match(bit)
        kwarg_format = match and match.group(1)
        if kwarg_format:
            key, value = match.groups()
            kwargs[key] = FilterExpression(value, parser)
        else:
            args.append(FilterExpression(bit, parser))

    return tag_name, args, kwargs


class StoreNode(template.Node):
    def __init__(self, nodelist, varname):
        self.nodelist = nodelist
        self.varname = varname

    def render(self, context):
        output = self.nodelist.render(context)
        context[self.varname] = output
        return ""


@register.tag(name="store")
def do_store(parser, token):
    """
    Store some template part in variable

    {% store as somevar %}
    <div class="{{ ololo }}">

    </div>
    {% endstore %}

    {% if needs_wrapping %}
    <div class="wrapper">{{ somevar }}</div>
    {% endif %}
    """
    try:
        # Splitting by None == splitting by spaces.
        tagname, arg = token.contents.split(None, 1)
    except ValueError:
        raise template.TemplateSyntaxError(
            "%r tag requires arguments",
            token.contents.split()[0],
        )

    varname = re.search(r'as "([a-z]+)"', arg)
    if not varname:
        raise template.TemplateSyntaxError(
            "%r tag requires argument as \"<varname>\"",
            tagname,
        )

    varname = varname.group(1)
    nodelist = parser.parse(('endstore',))
    parser.delete_first_token()
    return StoreNode(nodelist, varname)
