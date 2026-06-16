# Ambree Paris

Site web officiel d’Ambree Paris — Spray Tan Sur-Mesure à Paris.

## Structure

- `index.html` — Site complet (6 pages, responsive mobile + desktop)

## Déploiement GitHub Pages

1. Aller dans **Settings** du repo
1. Section **Pages**
1. Source : **Deploy from a branch**
1. Branch : **main** · Folder : **/ (root)**
1. Cliquer **Save**

Le site sera disponible sur `https://[username].github.io/[repo-name]`

## Domaine personnalisé (ambree-paris.fr)

Dans **Settings → Pages → Custom domain** :

1. Entrer `ambree-paris.fr`
1. Chez OVH, ajouter un enregistrement DNS **CNAME** :
- Nom : `www`
- Valeur : `[username].github.io`
1. Et un enregistrement **A** pour le domaine nu :
- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

## Contact

[hello@ambree-paris.fr](mailto:hello@ambree-paris.fr)