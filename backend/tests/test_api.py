import os
import sys

import pytest

from models import FileTag, Tag

# --- registering paths -------------------------------------------------------


def test_register_returns_id_and_classified_type(client, tmp_path):
    image = tmp_path / "picture.jpg"
    image.write_bytes(b"jpeg")

    response = client.post("/files", json={"path": str(image)})

    assert response.status_code == 200
    body = response.get_json()
    assert body["id"] > 0
    assert body["path"] == str(image)
    assert body["type"] == "image"


def test_register_classifies_a_directory_as_folder(client, media_folder):
    response = client.post("/files", json={"path": str(media_folder)})

    assert response.get_json()["type"] == "folder"


@pytest.mark.parametrize("payload", [{}, {"path": ""}, {"path": "   "}])
def test_register_rejects_a_missing_path(client, payload):
    response = client.post("/files", json=payload)

    assert response.status_code == 400


def test_equivalent_path_spellings_collapse_to_one_file(client, media_folder):
    """normalize_path_key exists so that these do not become separate rows."""
    spellings = [
        str(media_folder),
        str(media_folder) + os.sep,
        os.path.join(str(media_folder), "..", media_folder.name),
    ]
    if sys.platform == "win32":
        # normcase only folds case on Windows.
        spellings.append(str(media_folder).upper())

    ids = {client.post("/files", json={"path": s}).get_json()["id"] for s in spellings}

    assert len(ids) == 1
    assert len(client.get("/files").get_json()) == 1


def test_registering_the_same_path_twice_keeps_the_original_spelling(client, media_folder):
    first = client.post("/files", json={"path": str(media_folder)}).get_json()

    second = client.post("/files", json={"path": str(media_folder) + os.sep}).get_json()

    assert second["id"] == first["id"]
    assert second["path"] == str(media_folder)


def test_unknown_file_id_is_404(client):
    assert client.get("/files/999999").status_code == 404


# --- tags --------------------------------------------------------------------


def test_tag_names_are_case_insensitive(client, register, tmp_path):
    file_id = register(tmp_path / "a.jpg")

    client.post(f"/files/{file_id}/tags", json={"tag": "Anime"})
    client.post(f"/files/{file_id}/tags", json={"tag": "anime"})

    assert len(client.get("/tags").get_json()) == 1
    assert len(client.get(f"/files/{file_id}").get_json()["tags"]) == 1


@pytest.mark.parametrize("payload", [{}, {"tag": ""}, {"tag": "   "}])
def test_add_tag_rejects_an_empty_name(client, register, tmp_path, payload):
    file_id = register(tmp_path / "a.jpg")

    assert client.post(f"/files/{file_id}/tags", json=payload).status_code == 400


def test_removing_the_last_reference_deletes_the_tag(app, client, register, tmp_path):
    file_id = register(tmp_path / "a.jpg")
    client.post(f"/files/{file_id}/tags", json={"tag": "solo"})
    tag_id = client.get("/tags").get_json()[0]["id"]

    assert client.delete(f"/files/{file_id}/tags/{tag_id}").status_code == 200

    assert client.get("/tags").get_json() == []
    with app.app_context():
        assert FileTag.query.count() == 0


def test_a_tag_still_in_use_elsewhere_survives(client, register, tmp_path):
    kept = register(tmp_path / "kept.jpg")
    other = register(tmp_path / "other.jpg")
    for file_id in (kept, other):
        client.post(f"/files/{file_id}/tags", json={"tag": "shared"})
    tag_id = client.get("/tags").get_json()[0]["id"]

    client.delete(f"/files/{other}/tags/{tag_id}")

    assert [t["name"] for t in client.get("/tags").get_json()] == ["shared"]


def test_deleting_a_file_cascades_and_sweeps_orphan_tags(app, client, register, tmp_path):
    file_id = register(tmp_path / "a.jpg")
    client.post(f"/files/{file_id}/tags", json={"tag": "orphan"})

    assert client.delete(f"/files/{file_id}").status_code == 200

    assert client.get("/files").get_json() == []
    assert client.get("/tags").get_json() == []
    with app.app_context():
        # Relies on PRAGMA foreign_keys=ON; without it the association rows leak.
        assert FileTag.query.count() == 0
        assert Tag.query.count() == 0


# --- filtering ---------------------------------------------------------------


def test_multiple_tags_filter_with_and_semantics(client, register, tmp_path):
    both = register(tmp_path / "both.jpg")
    one = register(tmp_path / "one.jpg")
    for tag in ("alpha", "beta"):
        client.post(f"/files/{both}/tags", json={"tag": tag})
    client.post(f"/files/{one}/tags", json={"tag": "alpha"})

    matched = client.get("/files?tag=alpha&tag=beta").get_json()

    assert [f["id"] for f in matched] == [both]


def test_repeating_a_tag_in_different_cases_does_not_empty_the_result(client, register, tmp_path):
    """The filter counts distinct matched tags, so a duplicate that differs only
    by case would otherwise inflate the expected count and match nothing."""
    file_id = register(tmp_path / "a.jpg")
    client.post(f"/files/{file_id}/tags", json={"tag": "alpha"})

    matched = client.get("/files?tag=alpha&tag=ALPHA").get_json()

    assert [f["id"] for f in matched] == [file_id]


def test_unfiltered_listing_returns_every_file(client, register, tmp_path):
    register(tmp_path / "a.jpg")
    register(tmp_path / "b.jpg")

    assert len(client.get("/files").get_json()) == 2


def test_type_filter_returns_only_that_type(client, register, tmp_path):
    image = register(tmp_path / "a.jpg")
    register(tmp_path / "a.mp4")

    matched = client.get("/files?type=image").get_json()

    assert [f["id"] for f in matched] == [image]


def test_multiple_types_are_or_ed(client, register, tmp_path, media_folder):
    image = register(tmp_path / "a.jpg")
    video = register(tmp_path / "a.mp4")
    register(media_folder)  # a folder -- should not match image or video

    matched = client.get("/files?type=image&type=video").get_json()

    assert {f["id"] for f in matched} == {image, video}


def test_type_and_tag_filters_are_and_ed(client, register, tmp_path):
    tagged_image = register(tmp_path / "tagged.jpg")
    untagged_image = register(tmp_path / "untagged.jpg")
    tagged_video = register(tmp_path / "tagged.mp4")
    for file_id in (tagged_image, tagged_video):
        client.post(f"/files/{file_id}/tags", json={"tag": "alpha"})

    matched = client.get("/files?tag=alpha&type=image").get_json()

    assert [f["id"] for f in matched] == [tagged_image]
    assert untagged_image not in [f["id"] for f in matched]


def test_type_filter_is_case_insensitive(client, register, tmp_path):
    image = register(tmp_path / "a.jpg")

    matched = client.get("/files?type=IMAGE").get_json()

    assert [f["id"] for f in matched] == [image]


def test_unknown_type_matches_nothing(client, register, tmp_path):
    """An unrecognized type must not be treated as "no filter" and return
    everything -- it should filter down to an empty result instead."""
    register(tmp_path / "a.jpg")

    assert client.get("/files?type=bogus").get_json() == []


def test_selecting_every_type_matches_the_unfiltered_listing(
    client, register, tmp_path, media_folder
):
    register(tmp_path / "a.jpg")
    register(tmp_path / "a.mp4")
    register(media_folder)
    register(tmp_path / "notes.txt")

    all_types = client.get("/files?type=folder&type=image&type=video&type=other").get_json()
    unfiltered = client.get("/files").get_json()

    assert {f["id"] for f in all_types} == {f["id"] for f in unfiltered}


# --- folder contents ---------------------------------------------------------


def test_folder_items_are_media_only_and_naturally_sorted(client, register, media_folder):
    file_id = register(media_folder)

    items = client.get(f"/files/{file_id}/items").get_json()

    assert [i["name"] for i in items] == ["1.jpg", "2.jpg", "10.jpg", "a.mp4"]
    assert [i["type"] for i in items] == ["image", "image", "image", "video"]


def test_folder_thumbnail_is_its_first_media_file(client, register, media_folder):
    file_id = register(media_folder)

    assert client.get(f"/files/{file_id}").get_json()["thumbnail_type"] == "image"
    assert client.get(f"/files/{file_id}/content").data == b"data-1.jpg"


def test_content_streams_a_registered_file(client, register, tmp_path):
    image = tmp_path / "picture.jpg"
    image.write_bytes(b"jpeg-bytes")
    file_id = register(image)

    assert client.get(f"/files/{file_id}/content").data == b"jpeg-bytes"


def test_content_of_a_missing_file_is_404(client, register, tmp_path):
    file_id = register(tmp_path / "never-created.jpg")

    assert client.get(f"/files/{file_id}/content").status_code == 404


def test_folder_item_can_be_streamed_by_name(client, register, media_folder):
    file_id = register(media_folder)

    response = client.get(f"/files/{file_id}/content/2.jpg")

    assert response.status_code == 200
    assert response.data == b"data-2.jpg"


def test_folder_item_cannot_escape_the_registered_folder(client, register, media_folder, tmp_path):
    outside = tmp_path / "secret.jpg"
    outside.write_bytes(b"secret")
    file_id = register(media_folder)

    response = client.get(f"/files/{file_id}/content/../secret.jpg")

    # Werkzeug may reject the traversal during routing rather than in the view,
    # so the guarantee under test is only that the file never gets served.
    assert response.status_code != 200
    assert b"secret" not in response.data


def test_items_of_a_non_folder_is_empty(client, register, tmp_path):
    image = tmp_path / "picture.jpg"
    image.write_bytes(b"jpeg")
    file_id = register(image)

    assert client.get(f"/files/{file_id}/items").get_json() == []


# --- write-gating by connection origin ---------------------------------------

# Reserved for documentation (RFC 5737 TEST-NET-3): guaranteed not to be an
# address this machine actually owns, so it reliably exercises the "remote"
# path regardless of what network the test runner is on.
REMOTE_ADDR = "203.0.113.5"


def test_register_from_remote_address_is_rejected(make_app, tmp_path):
    client = make_app().test_client()
    image = tmp_path / "picture.jpg"
    image.write_bytes(b"jpeg")

    response = client.post(
        "/files",
        json={"path": str(image)},
        environ_base={"REMOTE_ADDR": REMOTE_ADDR},
    )

    assert response.status_code == 403


def test_browse_from_remote_address_is_rejected(make_app):
    client = make_app().test_client()

    response = client.get("/files/browse", environ_base={"REMOTE_ADDR": REMOTE_ADDR})

    assert response.status_code == 403


def test_delete_from_remote_address_is_rejected(make_app, tmp_path):
    client = make_app().test_client()
    image = tmp_path / "picture.jpg"
    image.write_bytes(b"jpeg")
    file_id = client.post("/files", json={"path": str(image)}).get_json()["id"]

    response = client.delete(f"/files/{file_id}", environ_base={"REMOTE_ADDR": REMOTE_ADDR})

    assert response.status_code == 403


def test_write_mode_off_rejects_even_local_requests(make_app, tmp_path):
    client = make_app(WRITE_MODE="off").test_client()
    image = tmp_path / "picture.jpg"
    image.write_bytes(b"jpeg")

    response = client.post("/files", json={"path": str(image)})

    assert response.status_code == 403


def test_write_mode_all_allows_remote_requests(make_app, tmp_path):
    client = make_app(WRITE_MODE="all").test_client()
    image = tmp_path / "picture.jpg"
    image.write_bytes(b"jpeg")

    response = client.post(
        "/files",
        json={"path": str(image)},
        environ_base={"REMOTE_ADDR": REMOTE_ADDR},
    )

    assert response.status_code == 200


def test_capabilities_reflects_write_mode_and_origin(make_app):
    local_client = make_app().test_client()
    assert local_client.get("/capabilities").get_json() == {"can_manage": True}

    off_client = make_app(WRITE_MODE="off").test_client()
    assert off_client.get("/capabilities").get_json() == {"can_manage": False}

    all_client = make_app(WRITE_MODE="all").test_client()
    response = all_client.get("/capabilities", environ_base={"REMOTE_ADDR": REMOTE_ADDR})
    assert response.get_json() == {"can_manage": True}

    local_mode_client = make_app().test_client()
    response = local_mode_client.get("/capabilities", environ_base={"REMOTE_ADDR": REMOTE_ADDR})
    assert response.get_json() == {"can_manage": False}
