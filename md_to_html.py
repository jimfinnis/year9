from markdown import Markdown

title = "Exomars GridWorld language"

md = Markdown(extensions=["fenced_code","codehilite","toc","extra"])


def toc(tokens):
    """Convert Python-Markdown toc_tokens into nested HTML <ul>/<li>."""
    html = ["<ul>"]

    for item in tokens:
        html.append(f'<li><a href="#{item["id"]}">{item["name"]}</a>')

        # Recursively render children
        if item.get("children"):
            html.append(toc(item["children"]))

        html.append("</li>")

    html.append("</ul>")
    return "".join(html)
    

with open("syntax.md") as f:
    html = md.convert(f.read())
    toc_html = toc(md.toc_tokens)
    with open("syntax_template.html") as f2:
        template = f2.read()
        html = template.replace("CONTENTSHERE",html)
        html = html.replace("TITLEHERE",title)
        html = html.replace("TOCHERE",toc_html)
        with open("syntax.html","w") as out:
            out.write(html)
